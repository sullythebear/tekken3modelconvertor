// Provisional anatomy for unskinned, upright, laterally extended human poses.
// No material/file names. Unknown/narrow/raised poses retain existing fallback.
export function staticArmRegion(point,box){
 const height=box.max.y-box.min.y,half=(box.max.x-box.min.x)/2;
 if(!(height>1e-6&&half>0)||half*2/height<.55||half*2/height>1.6)return null;
 const y=(point.y-box.min.y)/height,lateral=Math.abs(point.x-(box.min.x+box.max.x)/2)/half;
 if(y<=.5||y>=.82||lateral<.35)return null;
 const side=point.x>(box.min.x+box.max.x)/2?'left':'right';
 return side+(lateral>=.78?'Hand':lateral>=.55?'LowerArm':'UpperArm');
}
