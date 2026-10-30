// Anatomical source roles, NOT native Tekken3 row IDs or animation retargeting.
// TTT2 source names documented in upstream convert/skeleton.py (MIT notice).
export function ttt2Role(name){const n=name.replace(/^.*:/,'');const roles={KOSHI_jnt:'hips',MUNE1_jnt:'spine',ATAMA_Joint:'head'};for(const [suffix,side]of[['L','left'],['R','right']])for(const [joint,role]of[['SAKOTSU','Shoulder'],['KATA','UpperArm'],['UDE','LowerArm'],['TE','Hand'],['MOMO','UpperLeg'],['HIZA','LowerLeg'],['ASHI','Foot']])roles[`${joint}_${suffix}_jnt`]=side+role;return roles[n]??null;}
