import 'reflect-metadata';
import { Module, ValidationPipe, Catch, ExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
import { NestFactory, APP_GUARD } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import { randomUUID } from 'node:crypto';
import { Api, SimulatorControl } from './api';
import { Database } from './database';
import { AuthGuard } from './auth';
import { Telemetry } from './telemetry';
import { OperationalAlerts } from './operational';
@Catch()
class Errors implements ExceptionFilter {catch(e:any,host:ArgumentsHost){const res=host.switchToHttp().getResponse();const status=e instanceof HttpException?e.getStatus():e.code==='P2025'?404:e.code==='P2002'?409:500;if(status===500)console.error('Request failed',e.message);res.status(status).json({code:`AEGIS_${status}`,message:status===500?'Internal request failure':e instanceof HttpException?e.getResponse():status===409?'Record already exists':'Record not found',requestId:randomUUID()});}}
@Module({controllers:[Api],providers:[Database,Telemetry,SimulatorControl,OperationalAlerts,{provide:APP_GUARD,useClass:AuthGuard}]})class AppModule{}
async function main(){
 for(const key of ['JWT_SECRET','SERVICE_API_KEY','DATABASE_URL','INFLUX_TOKEN'])if(!process.env[key])throw new Error(`${key} required`);
 const app=await NestFactory.create(AppModule,{bodyParser:false});
 app.use(helmet({contentSecurityPolicy:false}));app.use(json({limit:'1mb'}));
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));app.useGlobalFilters(new Errors());
 const config=new DocumentBuilder().setTitle('AEGIS Research API').setDescription('Synthetic demonstration data. No diagnoses. Service ingestion and role-protected operations.').setVersion('0.1.1').addBearerAuth().addApiKey({type:'apiKey',in:'header',name:'x-service-key'},'serviceKey').build();
 SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,config));
 await app.listen(3000,'0.0.0.0');
 if(process.env.SIMULATOR_AUTOSTART==='true'){
  const db=app.get(Database);const sim=app.get(SimulatorControl);
  setTimeout(async()=>{try{const c=await db.crewMember.findFirst({orderBy:{code:'asc'}});const state:any=await sim.call('status');if(c&&state.status==='STOPPED'&&!state.runId)await sim.start({scenario:'NORMAL',seed:42,subjectId:c.id},'autostart');}catch(e:any){console.error('Autostart failed',e.message);}},5000);
 }
}
main();

