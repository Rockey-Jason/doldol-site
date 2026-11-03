/* Tunable machine-specific failure data. Probabilities are per reference exposure window. */
export const FAILURE_PROFILES=Object.freeze({
 smelter:{baseFailureProbability:.0012,referenceDurationSec:3600,loadRiskRange:{optimalRatio:1,criticalRatio:1.8},weights:{temperature:1.1,pressure:.25,powerInstability:.8,wear:1.4,load:.5},gradeDistribution:{minor:.72,major:.23,critical:.05},outcomes:{
  minor:{conditionDamage:3,repairSeconds:12,repairCondition:82,repairMaterials:{ironPlate:1},residue:{type:"maintenance_dust",amount:1}},
  major:{conditionDamage:16,repairSeconds:38,repairCondition:76,repairMaterials:{ironPlate:3,wire:1},residue:{type:"metal_scale",amount:2}},
  critical:{conditionDamage:38,broken:true,repairSeconds:95,repairCondition:68,repairMaterials:{ironPlate:6,circuit:1},residue:{type:"damaged_refractory",amount:3}}
 }},
 wiremill:{baseFailureProbability:.0009,referenceDurationSec:3600,loadRiskRange:{optimalRatio:1,criticalRatio:2},weights:{temperature:.5,pressure:.2,powerInstability:1.1,wear:1.2,load:.7},gradeDistribution:{minor:.76,major:.2,critical:.04},outcomes:{
  minor:{conditionDamage:2,repairSeconds:10,repairCondition:85,repairMaterials:{ironPlate:1},residue:{type:"copper_dust",amount:1}},
  major:{conditionDamage:14,repairSeconds:32,repairCondition:75,repairMaterials:{ironPlate:2,wire:1},residue:{type:"worn_roller",amount:1}},
  critical:{conditionDamage:34,broken:true,repairSeconds:80,repairCondition:66,repairMaterials:{ironPlate:5,circuit:1},residue:{type:"motor_failure",amount:1}}
 }},
 assembler:{baseFailureProbability:.0011,referenceDurationSec:3600,loadRiskRange:{optimalRatio:1,criticalRatio:1.7},weights:{temperature:.7,pressure:.4,powerInstability:1.1,wear:1.25,load:.8},gradeDistribution:{minor:.7,major:.24,critical:.06},outcomes:{
  minor:{conditionDamage:3,repairSeconds:14,repairCondition:82,repairMaterials:{wire:1},residue:{type:"solder_dross",amount:1}},
  major:{conditionDamage:17,repairSeconds:42,repairCondition:74,repairMaterials:{ironPlate:2,circuit:1},residue:{type:"jammed_feeder",amount:1}},
  critical:{conditionDamage:40,broken:true,repairSeconds:110,repairCondition:65,repairMaterials:{ironPlate:4,circuit:3},residue:{type:"control_board",amount:1}}
 }},
 reactor:{baseFailureProbability:.0018,referenceDurationSec:3600,loadRiskRange:{optimalRatio:1,criticalRatio:1.5},weights:{temperature:1.3,pressure:1.5,powerInstability:1.1,wear:1.2,load:1},gradeDistribution:{minor:.68,major:.25,critical:.07},outcomes:{
  minor:{conditionDamage:4,repairSeconds:22,repairCondition:80,repairMaterials:{ironPlate:2,wire:1},residue:{type:"catalyst_residue",amount:1}},
  major:{conditionDamage:21,repairSeconds:65,repairCondition:72,repairMaterials:{ironPlate:5,circuit:2},residue:{type:"pressure_seal",amount:1}},
  critical:{conditionDamage:48,broken:true,repairSeconds:160,repairCondition:62,repairMaterials:{ironPlate:10,circuit:5},residue:{type:"reactor_liner",amount:1}}
 }},
 variantLab:{baseFailureProbability:.0015,referenceDurationSec:3600,loadRiskRange:{optimalRatio:1,criticalRatio:1.6},weights:{temperature:1.2,pressure:.9,powerInstability:1,wear:1.15,load:.8},gradeDistribution:{minor:.7,major:.24,critical:.06},outcomes:{
  minor:{conditionDamage:3,repairSeconds:18,repairCondition:82,repairMaterials:{ironPlate:2},residue:{type:"crystal_dust",amount:1}},
  major:{conditionDamage:19,repairSeconds:56,repairCondition:72,repairMaterials:{ironPlate:4,circuit:2},residue:{type:"alignment_coil",amount:1}},
  critical:{conditionDamage:42,broken:true,repairSeconds:135,repairCondition:64,repairMaterials:{ironPlate:8,circuit:4},residue:{type:"crystal_chamber",amount:1}}
 }}
});
