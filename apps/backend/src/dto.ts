import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
export class LoginDto { @IsString() @Length(1,40) username!:string; @IsString() @Length(1,128) password!:string; }
export class SampleDto {
 @IsString() metric!:string;
 @IsNumber({allowNaN:false,allowInfinity:false}) value!:number;
 @IsString() unit!:string;
 @IsDateString() observedAt!:string;
 @IsIn(['GOOD','DEGRADED','INVALID','UNKNOWN']) quality!:string;
}
export class IngestDto {
 @IsInt() @IsIn([1]) schemaVersion!:number;
 @IsString() @Length(1,100) batchId!:string;
 @IsUUID() missionId!:string;
 @IsUUID() deviceId!:string;
 @IsIn(['SIMULATED']) source!:string;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1000) @ValidateNested({each:true}) @Type(()=>SampleDto) samples!:SampleDto[];
}
export class WaveformDto {
 @IsInt() @IsIn([1]) schemaVersion!:number;
 @IsString() @Length(1,100) batchId!:string;
 @IsUUID() missionId!:string;
 @IsUUID() deviceId!:string;
 @IsIn(['SIMULATED']) source!:string;
 @IsIn(['ecg']) signal!:string;
 @IsIn(['lead_demo']) channel!:string;
 @IsIn(['a.u.']) unit!:string;
 @IsDateString() startAt!:string;
 @IsInt() @IsIn([250]) samplingRateHz!:number;
 @IsArray() @ArrayMinSize(250) @ArrayMaxSize(7500) @IsNumber({allowNaN:false,allowInfinity:false},{each:true}) samples!:number[];
}
export class ScenarioDto {
 @IsIn(['NORMAL','FATIGUE_DEMO','HABITAT_CHANGE','SENSOR_LOSS','YELLOW_ALERT_DEMO','RED_ALERT_DEMO','SOLAR_EVENT_DEMO']) scenario!:string;
 @IsInt() @Min(1) @Max(2147483647) seed!:number;
 @IsUUID() subjectId!:string;
}
export class NoteDto { @IsString() @Length(3,1000) note!:string; }
export class CheckInDto {
 @IsUUID() crewMemberId!:string;
 @IsString() @Length(3,4000) notes!:string;
 @IsOptional() @IsString() @Length(0,120) title?:string;
 @IsOptional() @IsIn(['GENERAL','SLEEP','ACTIVITY','WELLBEING','NUTRITION','OTHER']) category?:string;
 @IsOptional() @IsDateString({strict:true}) observedAt?:string;
 @IsOptional() @IsInt() @Min(0) @Max(10) fatigueScore?:number;
 @IsOptional() @IsNumber() @Min(0) @Max(24) sleepHours?:number;
}
export class MissionDto { @IsString() @Length(3,20) code!:string; @IsString() @Length(3,100) name!:string; }
export class CrewDto { @IsUUID() missionId!:string; @IsString() @Length(3,20) code!:string; @IsString() @Length(3,100) displayName!:string; @IsString() @Length(3,60) role!:string; }
export class ProfileDto { @IsString() @Length(3,100) displayName!:string; @IsString() @Length(3,60) role!:string; }

// Explicit runtime OpenAPI metadata (no build-time Nest CLI plugin dependency).
const schemas:[any,Record<string,any>][]=[
 [LoginDto,{username:{example:'admin'},password:{format:'password'}}],
 [SampleDto,{metric:{example:'heart_rate'},value:{type:Number,example:62},unit:{example:'bpm'},observedAt:{format:'date-time'},quality:{enum:['GOOD','DEGRADED','INVALID','UNKNOWN']}}],
 [IngestDto,{schemaVersion:{type:Number,enum:[1]},batchId:{},missionId:{format:'uuid'},deviceId:{format:'uuid'},source:{enum:['SIMULATED']},samples:{type:[SampleDto],minItems:1,maxItems:1000}}],
 [WaveformDto,{schemaVersion:{type:Number,enum:[1]},batchId:{},missionId:{format:'uuid'},deviceId:{format:'uuid'},source:{enum:['SIMULATED']},signal:{enum:['ecg']},channel:{enum:['lead_demo']},unit:{enum:['a.u.']},startAt:{format:'date-time'},samplingRateHz:{type:Number,enum:[250]},samples:{type:[Number],minItems:250,maxItems:7500}}],
 [ScenarioDto,{scenario:{enum:['NORMAL','FATIGUE_DEMO','HABITAT_CHANGE','SENSOR_LOSS','YELLOW_ALERT_DEMO','RED_ALERT_DEMO','SOLAR_EVENT_DEMO']},seed:{type:Number,minimum:1,example:42},subjectId:{format:'uuid'}}],
 [NoteDto,{note:{minLength:3,maxLength:1000}}],
 [CheckInDto,{crewMemberId:{format:'uuid'},notes:{minLength:3,maxLength:4000},title:{required:false,maxLength:120},category:{required:false,enum:['GENERAL','SLEEP','ACTIVITY','WELLBEING','NUTRITION','OTHER']},observedAt:{required:false,format:'date-time'},fatigueScore:{type:Number,required:false,minimum:0,maximum:10},sleepHours:{type:Number,required:false,minimum:0,maximum:24}}],
 [MissionDto,{code:{example:'ARES-02'},name:{example:'Fictitious analog mission'}}],
 [CrewDto,{missionId:{format:'uuid'},code:{},displayName:{},role:{}}],
 [ProfileDto,{displayName:{},role:{}}]
];
for(const [model,fields] of schemas)for(const [key,options] of Object.entries(fields))ApiProperty({type:String,...options})(model.prototype,key);
