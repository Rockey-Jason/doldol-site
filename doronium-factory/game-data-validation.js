/* Canonical registry validation for the existing factory data tables. */
export function validateGameData({resources={},recipes={},variantRecipes={},buildings=[],research=[]}={}){
  const errors=[],warnings=[];
  const resourceIDs=new Set(Object.keys(resources));
  const recipeIDs=new Set(Object.keys(recipes));
  const researchIDs=new Set(research.map(x=>x?.id).filter(Boolean));
  const buildingIDs=new Set(buildings.map(x=>x?.id).filter(Boolean));
  const checkUnique=(values,label)=>{const seen=new Set();for(const value of values){if(!value)continue;if(seen.has(value))errors.push("duplicate-"+label+":"+value);seen.add(value)}};
  checkUnique(buildings.map(x=>x?.id),"building-id");
  checkUnique(research.map(x=>x?.id),"research-id");
  const checkItems=(items,label)=>{for(const [id,qty] of Object.entries(items||{})){if(!resourceIDs.has(id))errors.push(label+"-unknown-item:"+id);if(!Number.isFinite(Number(qty))||Number(qty)<=0)errors.push(label+"-invalid-quantity:"+id)}};
  const allRecipes={...recipes,...variantRecipes};
  for(const [id,recipe] of Object.entries(allRecipes)){
    if(!recipe||typeof recipe!=="object"){errors.push("invalid-recipe:"+id);continue}
    checkItems(recipe.inputs,"recipe-"+id+"-input");
    if(recipe.output&&!resourceIDs.has(recipe.output))errors.push("recipe-unknown-output:"+id+":"+recipe.output);
    if(!recipe.output&&!Object.hasOwn(variantRecipes,id))errors.push("recipe-missing-output:"+id);
    if(!Number.isFinite(Number(recipe.time))||Number(recipe.time)<=0)errors.push("recipe-invalid-duration:"+id);
    if(recipe.qty!==undefined&&(!Number.isInteger(Number(recipe.qty))||Number(recipe.qty)<=0))errors.push("recipe-invalid-output-quantity:"+id);
  }
  for(const building of buildings){
    if(building.recipe&&!recipeIDs.has(building.recipe))errors.push("building-unknown-recipe:"+building.id+":"+building.recipe);
    if(building.unlock&&!researchIDs.has(building.unlock))errors.push("building-unknown-research:"+building.id+":"+building.unlock);
    checkItems(building.materials,"building-"+building.id+"-material");
  }
  const graph=new Map();
  for(const node of research){
    if(!node?.id)continue;
    checkItems(node.need,"research-"+node.id+"-sample");
    const requirements=node.requires||[];
    for(const required of requirements)if(!researchIDs.has(required))errors.push("research-unknown-prerequisite:"+node.id+":"+required);
    if(!graph.has(node.id))graph.set(node.id,requirements);
  }
  const visiting=new Set(),visited=new Set();
  const visit=id=>{
    if(visiting.has(id)){errors.push("research-cycle:"+id);return}
    if(visited.has(id))return;
    visiting.add(id);
    for(const dependency of graph.get(id)||[])if(graph.has(dependency))visit(dependency);
    visiting.delete(id);visited.add(id);
  };
  for(const id of graph.keys())visit(id);
  if(resourceIDs.size===0)warnings.push("empty-resource-registry");
  return {valid:errors.length===0,errors,warnings,counts:{resources:resourceIDs.size,recipes:Object.keys(allRecipes).length,buildings:buildings.length,research:research.length}};
}
