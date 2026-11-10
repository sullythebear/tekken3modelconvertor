// CRC32 detects accidental stored-asset damage; not an authenticity/signature claim.
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function assetCRC(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++)crc=table[(crc^bytes[i])&255]^(crc>>>8);return ((crc^0xffffffff)>>>0).toString(16).padStart(8,'0');}
