import { Body, Controller, Get, Post, Patch, Param, Query, Req, BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException, ServiceUnavailableException, Injectable, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Database } from './database';
import { Telemetry } from './telemetry';
import { OperationalAlerts } from './operational';
import { Access, checkPassword, issue } from './auth';
import { LoginDto, IngestDto, WaveformDto, ScenarioDto, NoteDto, CheckInDto, MissionDto, CrewDto, ProfileDto } from './dto';
const readRoles=['ADMIN','MEDICAL_OFFICER','DEMO_VIEWER'];
@Injectable()
export class SimulatorControl {
 constructor(private db:Database,private telemetry:Telemetry){}
 async call(path:string,body?:unknown){try{const r=await fetch(`${process.env.SIMULATOR_URL}/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-service-key':process.env.SERVICE_API_KEY!},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error();return await r.json();}catch{throw new ServiceUnavailableException('Simulator unavailable');}}
 async start(input:ScenarioDto,actor:string){
  if(process.env.DEMO_MODE!=='true')throw new ForbiddenException('Demo disabled');
  const crew=await this.db.crewMember.findUnique({where:{id:input.subjectId}});if(!crew)throw new NotFoundException('Subject missing');
  const run=await this.db.simulationRun.create({data:{missionId:crew.missionId,scenario:input.scenario,seed:input.seed,status:'STARTING',config:{subjectId:input.subjectId}}});
  try{
   const devices=await this.db.device.findMany({where:{missionId:crew.missionId},orderBy:{code:'asc'}});const baselines=await this.db.healthBaseline.findMany({where:{crewMember:{missionId:crew.missionId}}});
   const metrics=await this.db.metricDefinition.findMany();const latest=await this.telemetry.latest();
   const status=await this.call('start',{...input,runId:run.id,devices,baselines,metrics,latest});
   await this.db.$transaction([this.db.simulationRun.updateMany({where:{id:{not:run.id},status:'RUNNING'},data:{status:'STOPPED',stoppedAt:new Date()}}),this.db.simulationRun.update({where:{id:run.id},data:{status:'RUNNING'}}),this.db.auditLog.create({data:{actorId:actor,action:'SIMULATION_STARTED',entityType:'SimulationRun',entityId:run.id,metadata:{scenario:input.scenario}}})]);return status;
  }catch(e){await this.db.simulationRun.update({where:{id:run.id},data:{status:'ERROR',stoppedAt:new Date()}});throw e;}
 }
 async stop(actor:string){const result=await this.call('stop',{});await this.db.simulationRun.updateMany({where:{status:'RUNNING'},data:{status:'STOPPED',stoppedAt:new Date()}});await this.db.auditLog.create({data:{actorId:actor,action:'SIMULATION_STOPPED',entityType:'SimulationRun',entityId:'active',metadata:{}}});return result;}
}
@ApiTags('AEGIS V0.1.1') @ApiBearerAuth() @Controller('api/v1')
export class Api {
 private loginAttempts=new Map<string,{at:number;count:number}>();
 constructor(private db:Database,private telemetry:Telemetry,private sim:SimulatorControl,private operational:OperationalAlerts){}
 scope(req:any,id?:string){if(req.user.role==='CREW'&&id!==req.user.crewMemberId)throw new ForbiddenException('Only own crew data is permitted');}
 async telemetryScope(req:any,id?:string){if(req.user.role!=='CREW'||id===req.user.crewMemberId)return;const crew=await this.db.crewMember.findUnique({where:{id:req.user.crewMemberId}});if(crew&&id&&await this.db.habitat.findFirst({where:{id,missionId:crew.missionId}}))return;throw new ForbiddenException('Only own crew data is permitted');}
 @Post('auth/login') @Access('PUBLIC') async login(@Body() b:LoginDto,@Req() req:any){
  const ip=req.ip;const a=this.loginAttempts.get(ip);const attempt=a&&Date.now()-a.at<60000?a:{at:Date.now(),count:0};attempt.count++;this.loginAttempts.set(ip,attempt);
  if(attempt.count>15)throw new ForbiddenException('Too many login attempts; wait one minute');
  const user=await this.db.user.findUnique({where:{username:b.username}});if(!user?.enabled||!checkPassword(b.password,user.passwordHash))throw new UnauthorizedException('Invalid credentials');
  return {token:issue(user),role:user.role,username:user.username,crewMemberId:user.crewMemberId};
 }
 @Post('auth/demo') @Access('PUBLIC') async demo(){if(process.env.DEMO_MODE!=='true')throw new ForbiddenException();const user=await this.db.user.findUniqueOrThrow({where:{username:'viewer'}});return {token:issue(user),role:user.role,username:user.username};}
 @Get('auth/me') me(@Req() req:any){return req.user;}
 @Get('missions') @Access(...readRoles) missions(){return this.db.mission.findMany({orderBy:{code:'asc'}});}
 @Post('missions') @Access('ADMIN') async createMission(@Body() b:MissionDto,@Req() req:any){const m=await this.db.mission.create({data:b});await this.audit(req,'MISSION_CREATED','Mission',m.id);return m;}
 @Get('crew') crew(@Req() req:any,@Query('missionId') missionId?:string){return this.db.crewMember.findMany({where:{...(missionId?{missionId}:{}),...(req.user.role==='CREW'?{id:req.user.crewMemberId}:{})},include:{baselines:true},orderBy:{code:'asc'}});}
 @Post('crew') @Access('ADMIN') async createCrew(@Body() b:CrewDto,@Req() req:any){const c=await this.db.crewMember.create({data:b});await this.audit(req,'CREW_CREATED','CrewMember',c.id);return c;}
 @Patch('crew/:id') @Access('ADMIN') async editCrew(@Param('id') id:string,@Body() b:ProfileDto,@Req() req:any){const c=await this.db.crewMember.update({where:{id},data:b});await this.audit(req,'CREW_UPDATED','CrewMember',id);return c;}
 @Get('devices') @Access(...readRoles) devices(){return this.db.device.findMany({orderBy:{code:'asc'}});}
 @Get('missions/:id/overview') @Access(...readRoles) async overview(@Param('id') id:string){
  const mission=await this.db.mission.findUnique({where:{id},include:{crew:{include:{baselines:true},orderBy:{code:'asc'}},habitats:true}});if(!mission)throw new NotFoundException();
  const latest=await this.telemetry.latest();const events=await this.db.healthEvent.findMany({where:{missionId:id,status:{not:'RESOLVED'}},orderBy:{firstObservedAt:'desc'},take:50});
  return {mission,latest:latest.filter(x=>mission.crew.some(c=>c.id===x.subjectId)||mission.habitats.some(h=>h.id===x.subjectId)),events,receivedAt:new Date().toISOString()};
 }
 @Get('crew/:id/overview') async crewOverview(@Param('id') id:string,@Req() req:any){this.scope(req,id);const crew=await this.db.crewMember.findUnique({where:{id},include:{baselines:true}});if(!crew)throw new NotFoundException();return {crew,latest:await this.telemetry.latest(id),events:await this.db.healthEvent.findMany({where:{crewMemberId:id},orderBy:{firstObservedAt:'desc'},take:50})};}
 @Get('crew/:id/baseline') baseline(@Param('id') id:string,@Req() req:any){this.scope(req,id);return this.db.healthBaseline.findMany({where:{crewMemberId:id},orderBy:{version:'desc'}});}
 @Get('crew/:id/operational-view') async operationalView(@Param('id',new ParseUUIDPipe()) id:string,@Query('environment') environment:string,@Req() req:any){this.scope(req,id);return this.operational.view(id,environment,await this.telemetry.catalog(id));}
 @Post('telemetry/ingest') @ApiSecurity('serviceKey') @Access('SERVICE') ingest(@Body() b:IngestDto){return this.telemetry.ingest(b);}
 @Post('simulator/history') @Access('ADMIN') importHistory(@Body() b:IngestDto,@Req() req:any){return this.telemetry.importDemoHistory(b,req.user.sub);}
 @Post('telemetry/waveforms') @ApiSecurity('serviceKey') @Access('SERVICE') wave(@Body() b:WaveformDto){return this.telemetry.wave(b);}
 @Get('telemetry/latest') latest(@Query('subjectId') id:string,@Req() req:any){this.scope(req,id);return this.telemetry.latest(id);}
 @Get('telemetry/catalog') catalog(@Query('subjectId') id:string,@Req() req:any){this.scope(req,id);return this.telemetry.catalog(id);}
 @Get('telemetry/history') async history(@Query('subjectId') id:string,@Query('metric') metric:string,@Query('from') from:string,@Query('to') to:string,@Req() req:any){await this.telemetryScope(req,id);return this.telemetry.history(id,metric,from,to);}
 @Get('telemetry/waveforms') waveform(@Query('subjectId') id:string,@Query('from') from:string,@Query('to') to:string,@Req() req:any){this.scope(req,id);return this.telemetry.history(id,'ecg',from,to,true);}
 @Post('analytics/ecg') @Access('ADMIN','MEDICAL_OFFICER') process(@Query('subjectId') id:string){return this.telemetry.process(id);}
 @Post('analytics/hrv') @Access('ADMIN','MEDICAL_OFFICER') processHrv(@Query('subjectId') id:string){return this.telemetry.processHrv(id);}
 @Get('events') async events(@Req() req:any,@Query('subjectId') id?:string,@Query('status') status?:string,@Query('page') page='1'){
  if(status&&!['OPEN','ACKNOWLEDGED','RESOLVED'].includes(status))throw new BadRequestException('Invalid status');
  const p=Number(page);if(!Number.isInteger(p)||p<1||p>1000)throw new BadRequestException('Invalid page');
  return this.db.healthEvent.findMany({where:{...(req.user.role==='CREW'?{crewMemberId:req.user.crewMemberId}:id?{crewMemberId:id}:{}),...(status?{status}:{})},include:{crewMember:true},orderBy:{firstObservedAt:'desc'},take:50,skip:(p-1)*50});
 }
 @Post('events/:id/acknowledge') @Access('ADMIN','MEDICAL_OFFICER') acknowledge(@Param('id') id:string,@Body() b:NoteDto,@Req() req:any){return this.transition(id,'OPEN','ACKNOWLEDGED',b.note,req.user.sub);}
 @Post('events/:id/resolve') @Access('ADMIN','MEDICAL_OFFICER') resolve(@Param('id') id:string,@Body() b:NoteDto,@Req() req:any){return this.transition(id,'ACKNOWLEDGED','RESOLVED',b.note,req.user.sub);}
 private async transition(id:string,from:string,to:string,note:string,actor:string){return this.db.$transaction(async tx=>{
  const result=await tx.healthEvent.updateMany({where:{id,status:from},data:{status:to,...(to==='ACKNOWLEDGED'?{acknowledgedAt:new Date(),acknowledgedBy:actor,acknowledgementNote:note}:{resolvedAt:new Date(),resolvedBy:actor,resolutionNote:note})}});
  if(result.count!==1)throw new BadRequestException(`Event must be ${from}`);
  await tx.auditLog.create({data:{actorId:actor,action:to,entityType:'HealthEvent',entityId:id,metadata:{note}}});return tx.healthEvent.findUnique({where:{id}});
 });}
 @Get('check-ins') checkIns(@Query('subjectId',new ParseUUIDPipe()) id:string,@Query('page') page='1',@Req() req:any){
  this.scope(req,id);const p=Number(page);if(!Number.isInteger(p)||p<1||p>1000)throw new BadRequestException('Invalid page');
  return this.db.healthCheckIn.findMany({where:{crewMemberId:id},orderBy:[{observedAt:'desc'},{recordedAt:'desc'},{id:'desc'}],take:50,skip:(p-1)*50});
 }
 @Post('check-ins') @Access('ADMIN','MEDICAL_OFFICER','CREW') async checkIn(@Body() b:CheckInDto,@Req() req:any){
  this.scope(req,b.crewMemberId);
  const now=new Date();const observedAt=b.observedAt?new Date(b.observedAt):now;
  if((b.observedAt&&!/(Z|\+00:00)$/.test(b.observedAt))||!Number.isFinite(observedAt.getTime())||observedAt>now)throw new BadRequestException('Observation time must be UTC and cannot be in the future');
  if(!b.notes.trim())throw new BadRequestException('Write an observation');
  if(!await this.db.crewMember.findUnique({where:{id:b.crewMemberId}}))throw new NotFoundException('Subject missing');
  return this.db.$transaction(async tx=>{
   const c=await tx.healthCheckIn.create({data:{...b,title:b.title??'',category:b.category??'GENERAL',observedAt,createdBy:req.user.sub}});
   await tx.auditLog.create({data:{actorId:req.user.sub,action:'CHECK_IN_CREATED',entityType:'HealthCheckIn',entityId:c.id,metadata:{}}});return c;
  });
 }
 @Get('simulator/status') @Access(...readRoles) status(){return this.sim.call('status');}
 @Post('simulator/start') @Access('ADMIN') start(@Body() b:ScenarioDto,@Req() req:any){return this.sim.start(b,req.user.sub);}
 @Post('simulator/stop') @Access('ADMIN') stop(@Req() req:any){return this.sim.stop(req.user.sub);}
 @Get('audit') @Access('ADMIN') logs(){return this.db.auditLog.findMany({orderBy:{createdAt:'desc'},take:100});}
 @Get('system/live') @Access('PUBLIC') live(){return {status:'UP',version:'0.1.1'};}
 @Get('system/health') @Access(...readRoles) async health(){
  const checks=await Promise.allSettled([this.db.$queryRaw`SELECT 1`,this.telemetry.rows('buckets() |> limit(n:1)'),fetch(`${process.env.ANALYTICS_URL}/health`,{signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)throw new Error();return r.json();}),this.sim.call('status')]);
  const names=['postgres','influxdb','analytics','simulator'];return {status:checks.every(r=>r.status==='fulfilled')?'UP':'DEGRADED',version:'0.1.1',checkedAt:new Date().toISOString(),services:Object.fromEntries(checks.map((r,i)=>[names[i],r.status==='fulfilled'?'UP':'DOWN']))};
 }
 private audit(req:any,action:string,entityType:string,entityId:string){return this.db.auditLog.create({data:{actorId:req.user.sub,action,entityType,entityId,metadata:{}}});}
}

