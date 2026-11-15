import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sign, verify } from 'jsonwebtoken';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { Database } from './database';
export const Access=(...roles:string[])=>SetMetadata('access',roles);
export const issue=(u:{id:string;role:string;crewMemberId?:string|null})=>sign({sub:u.id,role:u.role,crewMemberId:u.crewMemberId},process.env.JWT_SECRET!,{expiresIn:'8h',issuer:'aegis',audience:'aegis-local'});
export function checkPassword(password:string,hash:string){const [salt,key]=hash.split(':');const computed=scryptSync(password,salt,64);return key.length===128&&timingSafeEqual(computed,Buffer.from(key,'hex'));}
@Injectable()
export class AuthGuard implements CanActivate {
 constructor(private reflector:Reflector,private db:Database){}
 async canActivate(ctx:ExecutionContext){
  const roles=this.reflector.getAllAndOverride<string[]>('access',[ctx.getHandler(),ctx.getClass()])||['ADMIN','MEDICAL_OFFICER','DEMO_VIEWER','CREW'];
  if(roles.includes('PUBLIC'))return true;
  const req=ctx.switchToHttp().getRequest();
  if(roles.includes('SERVICE')){
   const key=req.headers['x-service-key'];const expected=process.env.SERVICE_API_KEY!;
   if(typeof key!=='string'||key.length!==expected.length||!timingSafeEqual(Buffer.from(key),Buffer.from(expected)))throw new UnauthorizedException();
   req.user={sub:'simulator',role:'SERVICE'};return true;
  }
  try{
   const payload=verify((req.headers.authorization||'').replace(/^Bearer /,''),process.env.JWT_SECRET!,{issuer:'aegis',audience:'aegis-local'}) as any;
   const u=await this.db.user.findUnique({where:{id:payload.sub}});
   if(!u?.enabled)throw new Error();req.user={sub:u.id,role:u.role,crewMemberId:u.crewMemberId};
  }catch{throw new UnauthorizedException('Sign in required');}
  if(!roles.includes(req.user.role))throw new ForbiddenException('Role not permitted');return true;
 }
}
