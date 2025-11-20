'use strict';class GltfModel
{constructor(runtime,sdkType,inst)
{const mat4=globalThis.glMatrix3D.mat4;this._runtime=runtime;this._sdkType=sdkType;this.inst=inst;this.gltfData={};this._blendState='init';this._lastTarget=[];this._blendTarget=[];this._blendTime=0;this._lastIndex=0;this.drawMeshes=[];this.drawMeshesIndex=0;this.currentColor=[-1,-1,-1,-1];this.nodeMeshMap={};this.modelRotate=mat4.create();}
async init(){this._sdkType.gltfData.gltf.buffers=null;this.gltfData=await this.structuralClone(this._sdkType.gltfData.gltf)
if('buffers'in this.gltfData){this.gltfData.buffers=null}
if('imageBitmap'in this.gltfData){this.gltfData.imageBitmap=null}
if(this.gltfData.nodes!==undefined){for(let ii=0;ii<this.gltfData.nodes.length;ii++){let node=this.gltfData.nodes[ii];if(!node.mesh)continue;this.nodeMeshMap[node.name]=node.mesh.name;}}else{console.log("Error loading model!");this.inst.Trigger(globalThis.C3.Plugins.Mikal_3DObject.Cnds.onLoadFailed);}}
structuralClone(obj){return new Promise(resolve=>{const{port1,port2}=new MessageChannel();port2.onmessage=ev=>resolve(ev.data);port1.postMessage(obj);});}
render(renderer,x,y,z,tempQuad,whiteTexture,instanceC3Color,textures,instanceTexture)
{let totalTriangles=0;let currentColor=[-1,-1,-1,-1];let currentTexture=null;const vec4=globalThis.glMatrix3D.vec4;const mat4=globalThis.glMatrix3D.mat4;const quat=globalThis.glMatrix3D.quat;const instanceColor=[instanceC3Color.getR(),instanceC3Color.getG(),instanceC3Color.getB(),instanceC3Color.getA()];const finalColor=vec4.create();const tmpModelView=mat4.create();const modelRotate=mat4.create();if(!this.inst.isEditor){mat4.copy(tmpModelView,renderer._matMV);const xAngle=this.inst.xAngle;const yAngle=this.inst.yAngle;const zAngle=this.inst.zAngle;const xScale=this.inst.scale/(this.inst.xScale==0?1:this.inst.xScale);const yScale=this.inst.scale/(this.inst.yScale==0?1:this.inst.yScale);const zScale=this.inst.scale/(this.inst.zScale==0?1:this.inst.zScale);const rotate=quat.create();if(this.inst.cannonBody&&this.inst.cannonSetRotation){quat.set(rotate,this.inst.cannonBody.quaternion.x,this.inst.cannonBody.quaternion.y,this.inst.cannonBody.quaternion.z,this.inst.cannonBody.quaternion.w);}else{quat.fromEuler(rotate,xAngle,yAngle,zAngle);}
mat4.fromRotationTranslationScale(modelRotate,rotate,[x,y,z],[xScale,-yScale,zScale]);mat4.copy(this.modelRotate,modelRotate);mat4.multiply(modelRotate,tmpModelView,modelRotate);renderer.SetModelViewMatrix(modelRotate);}else{z=0;}
renderer.SetColor(instanceC3Color);for(let j=0;j<=this.drawMeshesIndex;j++)
{if(this.drawMeshes[j].disabled)continue;const drawVerts=this.drawMeshes[j].drawVerts;const drawUVs=this.drawMeshes[j].drawUVs;const drawIndices=this.drawMeshes[j].drawIndices;const material=this.drawMeshes[j].material;const hasTexture=(material&&'pbrMetallicRoughness'in material&&'baseColorTexture'in material.pbrMetallicRoughness);let color;if(material&&'pbrMetallicRoughness'in material&&'baseColorFactor'in material.pbrMetallicRoughness){color=material.pbrMetallicRoughness.baseColorFactor}else{color=null;}
if(color&&color.length==4){color[3]=1;vec4.multiply(finalColor,instanceColor,color);if(vec4.equals(finalColor,currentColor)==false){vec4.copy(currentColor,finalColor);renderer.SetColorRgba(finalColor[0],finalColor[1],finalColor[2],finalColor[3]);}}
if(!instanceTexture){if(!hasTexture){if(currentTexture!=whiteTexture){renderer.SetTexture(whiteTexture);currentTexture=whiteTexture;}}else{const texture=textures[material.name];if(!texture)continue;if(texture!=currentTexture){renderer.SetTexture(texture);currentTexture=texture;}}}
for(let ii=0;ii<drawVerts.length;ii++)
{let v=drawVerts[ii];let uv=drawUVs[ii];let ind=drawIndices[ii];let triangleCount=ind.length/3;let center=[0,0,0];totalTriangles+=triangleCount;for(let i=0;i<triangleCount;i++)
{if(hasTexture)
{tempQuad.set(uv[ind[i*3+0]*2+0],uv[ind[i*3+0]*2+1],uv[ind[i*3+1]*2+0],uv[ind[i*3+1]*2+1],uv[ind[i*3+2]*2+0],uv[ind[i*3+2]*2+1],uv[ind[i*3+2]*2+0],uv[ind[i*3+2]*2+1]);}else
{tempQuad.set(0,0,1,0,0,1,0,1);}
let i3=i*3;let x0,y0,z0,x1,y1,z1,x2,y2,z2;x0=(v[ind[i3+0]*3+0]);y0=(v[ind[i3+0]*3+1]);z0=(v[ind[i3+0]*3+2])-z;x1=(v[ind[i3+1]*3+0]);y1=(v[ind[i3+1]*3+1]);z1=(v[ind[i3+1]*3+2])-z;x2=(v[ind[i3+2]*3+0]);y2=(v[ind[i3+2]*3+1]);z2=(v[ind[i3+2]*3+2])-z;renderer.Quad3D2(x0,y0,z0,x1,y1,z1,x2,y2,z2,x2,y2,z2,tempQuad);}}}
if(!this.inst.isEditor){renderer.SetModelViewMatrix(tmpModelView);}}
transformNode(node,parentMat,modelScaleRotate)
{const mat4=globalThis.glMatrix3D.mat4;const quat=globalThis.glMatrix3D.quat;const vec3=globalThis.glMatrix3D.vec3;const gltf=this.gltfData;let dummyMat4Out=mat4.create();const scale=this.inst.scale;const xScale=this.inst.scale/(this.inst.xScale==0?1:this.inst.xScale);const yScale=this.inst.scale/(this.inst.yScale==0?1:this.inst.yScale);const zScale=this.inst.scale/(this.inst.zScale==0?1:this.inst.zScale);if(parentMat!=undefined)
mat4.copy(node.matrix,parentMat);else
mat4.identity(node.matrix);mat4.translate(node.matrix,node.matrix,node.translation);mat4.multiply(node.matrix,node.matrix,mat4.fromQuat(dummyMat4Out,node.rotation));mat4.scale(node.matrix,node.matrix,node.scale);if(node.skin!=undefined)
mat4.invert(node.invMatrix,node.matrix);if(node.mesh!=undefined&&node.skin==undefined)
{for(let i=0;i<node.mesh.primitives.length;i++)
{let transformedVerts=[];transformedVerts.length=0;let posData=node.mesh.primitives[i].attributes.POSITION.data;this.drawMeshesIndex++;if(!this.drawMeshes[this.drawMeshesIndex]){this.drawMeshes.push({drawVerts:[],drawUVs:[],drawIndices:[],disabled:false,})}
this.drawMeshes[this.drawMeshesIndex].disabled=node.disabled;if('material'in node.mesh.primitives[i]){this.drawMeshes[this.drawMeshesIndex].material=node.mesh.primitives[i].material;}else{this.drawMeshes[this.drawMeshesIndex].material=null;}
const drawVerts=this.drawMeshes[this.drawMeshesIndex].drawVerts;const drawUVs=this.drawMeshes[this.drawMeshesIndex].drawUVs;const drawIndices=this.drawMeshes[this.drawMeshesIndex].drawIndices;drawVerts.length=0;let v=[0,0,0];for(let j=0;j<posData.length/3;j++)
{vec3.transformMat4(v,posData.subarray(j*3,j*3+3),node.matrix);if(this.inst.isEditor){vec3.transformMat4(v,v,modelScaleRotate);}
const x=v[0]
const y=v[1]
const z=v[2]
if(this.inst.minBB[0]>x)this.inst.minBB[0]=x
if(this.inst.minBB[1]>y)this.inst.minBB[1]=y
if(this.inst.minBB[2]>z)this.inst.minBB[2]=z
if(this.inst.maxBB[0]<x)this.inst.maxBB[0]=x
if(this.inst.maxBB[1]<y)this.inst.maxBB[1]=y
if(this.inst.maxBB[2]<z)this.inst.maxBB[2]=z
transformedVerts.push(x,y,z);}
if(transformedVerts.length>0)
{if(gltf.pointBatch!=undefined)
for(let ii=0;ii<transformedVerts.length;ii++)
gltf.pointBatch.push(transformedVerts[ii]);else
{drawVerts.push(transformedVerts);if(drawUVs.length===0&&('TEXCOORD_0'in node.mesh.primitives[i].attributes)){drawUVs.push(Array.from(node.mesh.primitives[i].attributes.TEXCOORD_0.data));}
if(drawIndices.length===0)drawIndices.push(Array.from(node.mesh.primitives[i].indices.data));}}}}
if(node.children!=undefined)
for(let i=0;i<node.children.length;i++)
this.transformNode(node.children[i],node.matrix,modelScaleRotate);}
getPolygons()
{const vec3=globalThis.glMatrix3D.vec3;const mat4=globalThis.glMatrix3D.mat4;const quat=globalThis.glMatrix3D.quat;const gltf=this.gltfData;const scale=this.inst.scale;const xScale=this.inst.scale/(this.inst.xScale==0?1:this.inst.xScale);const yScale=this.inst.scale/(this.inst.yScale==0?1:this.inst.yScale);const zScale=this.inst.scale/(this.inst.zScale==0?1:this.inst.zScale);this.drawMeshesIndex=-1;const modelScaleRotate=mat4.create();if(this.inst.isEditor){const xAngle=this.inst.xAngle;const yAngle=this.inst.yAngle;const zAngle=this.inst.zAngle;const x=this.inst._inst.GetX();const y=this.inst._inst.GetY();const z=this.inst.zElevation;const rotate=quat.create();quat.fromEuler(rotate,xAngle,yAngle,zAngle);mat4.fromRotationTranslationScale(modelScaleRotate,rotate,[x,y,z],[xScale,-yScale,zScale]);}
let rotationQuat=quat.create();let parentMatrix=mat4.create();quat.fromEuler(rotationQuat,0,0,0);mat4.fromRotationTranslation(parentMatrix,rotationQuat,[0,0,0])
this.inst.minBB=[100000,10000,10000];this.inst.maxBB=[-10000,-10000,-10000];if(gltf.scene!=="undefined"&&gltf.scene.nodes!=="undefined"){for(let i=0;i<gltf.scene.nodes.length;i++)
{this.transformNode(gltf.scene.nodes[i],parentMatrix,modelScaleRotate);}}else{console.log("Error loading nodes!");this.inst.Trigger(globalThis.C3.Plugins.Mikal_3DObject.Cnds.onLoadFailed);}
quat.fromEuler(rotationQuat,0,0,0);for(let ii=0;ii<gltf.skinnedNodes.length;ii++)
{let node=gltf.skinnedNodes[ii];node.rotation=rotationQuat;for(let jj=0;jj<node.skin.joints.length;jj++)
{let joint=node.skin.joints[jj];mat4.multiply(joint.boneMatrix,node.invMatrix,joint.matrix);mat4.multiply(joint.boneMatrix,joint.boneMatrix,joint.invBindMatrix);}
for(let i=0;i<node.mesh.primitives.length;i++)
{this.drawMeshesIndex++;if(!this.drawMeshes[this.drawMeshesIndex]){this.drawMeshes.push({drawVerts:[],drawUVs:[],drawIndices:[],disabled:true,})}
this.drawMeshes[this.drawMeshesIndex].disabled=node.disabled;if('material'in node.mesh.primitives[i]){this.drawMeshes[this.drawMeshesIndex].material=node.mesh.primitives[i].material;}else{this.drawMeshes[this.drawMeshesIndex].material=null;}
const drawVerts=this.drawMeshes[this.drawMeshesIndex].drawVerts;const drawUVs=this.drawMeshes[this.drawMeshesIndex].drawUVs;const drawIndices=this.drawMeshes[this.drawMeshesIndex].drawIndices;drawVerts.length=0;let transformedVerts=[];let posData=node.mesh.primitives[i].attributes.POSITION.data;let weights=node.mesh.primitives[i].attributes.WEIGHTS_0.data;let joints=node.mesh.primitives[i].attributes.JOINTS_0.data;for(let j=0;j<posData.length/3;j++)
{let w=weights.subarray(j*4,j*4+4);let b=joints.subarray(j*4,j*4+4);let vin=posData.subarray(j*3,j*3+3)
let v=[0,0,0],vsum=[0,0,0];for(let i=0;i<4;i++)
{vec3.transformMat4(v,vin,node.skin.joints[b[i]].boneMatrix);vec3.scale(v,v,w[i]);vec3.add(vsum,vsum,v);}
if(this.inst.isEditor){vec3.transformMat4(vsum,vsum,modelScaleRotate);}
const x=vsum[0]
const y=vsum[1]
const z=vsum[2]
if(this.inst.minBB[0]>x)this.inst.minBB[0]=x
if(this.inst.minBB[1]>y)this.inst.minBB[1]=y
if(this.inst.minBB[2]>z)this.inst.minBB[2]=z
if(this.inst.maxBB[0]<x)this.inst.maxBB[0]=x
if(this.inst.maxBB[1]<y)this.inst.maxBB[1]=y
if(this.inst.maxBB[2]<z)this.inst.maxBB[2]=z
transformedVerts.push(x,y,z);}
if(transformedVerts.length>0)
{if(gltf.pointBatch!=undefined)
for(let ii=0;ii<transformedVerts.length;ii++)
gltf.pointBatch.push(transformedVerts[ii]);else
{drawVerts.push(transformedVerts);if(drawUVs.length===0&&('TEXCOORD_0'in node.mesh.primitives[i].attributes)){drawUVs.push(Array.from(node.mesh.primitives[i].attributes.TEXCOORD_0.data));}
if(drawIndices.length===0)drawIndices.push(Array.from(node.mesh.primitives[i].indices.data));}}}}}
getAnimationNames()
{const gltf=this.gltfData;let names=[];if(!gltf.animations)return names;for(let i=0;i<gltf.animations.length;i++)
names.push(gltf.animations[i].name);return names;}
updateAnimation(index,time,onScreen,deltaTime)
{const vec3=globalThis.glMatrix3D.vec3;const quat=globalThis.glMatrix3D.quat;const gltf=this.gltfData;const animationBlend=this.inst.animationBlend;let anim=gltf.animations[index];switch(this._blendState){case 'init':if(animationBlend!=0&&this._lastIndex!=index){this._blendState='blend'
this._blendTime=0;this._blendTarget=JSON.parse(JSON.stringify(this._lastTarget));this._lastIndex=index;}
break;case 'blend':if(this._lastIndex!=index){this._blendState='blend'
this._blendTime=0;this._blendTarget=JSON.parse(JSON.stringify(this._lastTarget));this._lastIndex=index;break;}
if(this._blendTime>animationBlend){this._blendState='idle'
break}
this._blendTime+=deltaTime
break;case 'idle':if(this._lastIndex!=index){this._blendState='blend'
this._blendTime=0;this._blendTarget=JSON.parse(JSON.stringify(this._lastTarget));this._lastIndex=index;}
break;default:console.warn('[3DObject] bad blend state:',this._blendState)}
this._lastTarget=[];for(let i=0;i<anim.channels.length;i++)
{let c=anim.channels[i];let timeValues=c.sampler.input;let otherValues=c.sampler.output.data;let target=c.target;if(this.inst.animationLoop)
{time=(time-timeValues.min[0])%(timeValues.max[0]-timeValues.min[0])+timeValues.min[0];}else
{if(time>timeValues.max[0])
{time=timeValues.max[0]-0.01;if(!this.inst.animationFinished)
{this.inst.animationFinished=true;this.inst.Trigger(self.C3.Plugins.Mikal_3DObject.Cnds.OnAnimationFinished);}}}
this.inst.currentAnimationTime=time;if(!onScreen)continue
timeValues=timeValues.data;let t0,t1;for(t0=0,t1=1;t0<timeValues.length-1;t0++,t1++)
if(time>=timeValues[t0]&&time<=timeValues[t1])
break;this.inst.currentAnimationFrame=t0;let t=(time-timeValues[t0])/(timeValues[t1]-timeValues[t0]);this.inst.currentAnimationFrame=Math.round(t0+t);if(timeValues[t1]==null)break
if(target.path=="translation")
vec3.lerp(target.node.translation,otherValues.subarray(t0*3,t0*3+3),otherValues.subarray(t1*3,t1*3+3),t);else if(target.path=="rotation")
quat.slerp(target.node.rotation,otherValues.subarray(t0*4,t0*4+4),otherValues.subarray(t1*4,t1*4+4),t);else if(target.path=="scale")
vec3.lerp(target.node.scale,otherValues.subarray(t0*3,t0*3+3),otherValues.subarray(t1*3,t1*3+3),t);if(this._blendState=='blend'){const blend=this._blendTime==0?0:this._blendTime/animationBlend;const blendTarget=this._blendTarget[i];if(blendTarget!=null){if(target.path=="translation"&&blendTarget.path=="translation")
vec3.lerp(target.node.translation,blendTarget.node.translation,target.node.translation,blend);else if(target.path=="rotation"&&blendTarget.path=="rotation")
quat.slerp(target.node.rotation,blendTarget.node.rotation,target.node.rotation,blend);else if(target.path=="scale"&&blendTarget.path=="scale")
vec3.lerp(target.node.scale,blendTarget.node.scale,target.node.scale,blend);}}
if(animationBlend!=0)this._lastTarget.push(target);}}}
globalThis.GltfModel=GltfModel;