// Deterministic pixel-centre coverage in UV space. Earlier triangles own ties,
// matching the source baker's original first-containing-triangle policy.
export function uvRasterLookup(triangles, width, height = width) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 16 * 1024 ** 2
  )
    throw Error("Invalid UV raster dimensions");
  const lookup = new Int32Array(width * height).fill(-1),
    faces = triangles.map(([a, b, c]) => ({
      a,
      b,
      c,
      det: (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y),
    }));
  for (let i = 0; i < faces.length; i++) {
    const { a, b, c, det } = faces[i];
    if (!Number.isFinite(det) || Math.abs(det) < 1e-10) continue;
    const minX = Math.max(
        0,
        Math.floor(Math.min(a.x, b.x, c.x) * width - 0.5) - 1,
      ),
      maxX = Math.min(
        width - 1,
        Math.ceil(Math.max(a.x, b.x, c.x) * width - 0.5) + 1,
      ),
      minY = Math.max(
        0,
        Math.floor(Math.min(a.y, b.y, c.y) * height - 0.5) - 1,
      ),
      maxY = Math.min(
        height - 1,
        Math.ceil(Math.max(a.y, b.y, c.y) * height - 0.5) + 1,
      );
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const pixel = y * width + x;
        if (lookup[pixel] >= 0) continue;
        const u = (x + 0.5) / width,
          v = (y + 0.5) / height,
          wa = ((b.y - c.y) * (u - c.x) + (c.x - b.x) * (v - c.y)) / det,
          wb = ((c.y - a.y) * (u - c.x) + (a.x - c.x) * (v - c.y)) / det,
          wc = 1 - wa - wb;
        if (Math.min(wa, wb, wc) >= -1e-6) lookup[pixel] = i;
      }
  }
  return lookup;
}

// Extend genuine covered texels only within their own chart's gutter domain.
// Unseeded charts remain explicit failures instead of becoming black skin.
export function dilateChartTexels(rgba,valid,charts,width,height=width){
 const count=width*height;if(rgba.length!==count*4||valid.length!==count||charts.length!==count)throw Error('Invalid chart dilation buffers');
 const queue=new Int32Array(count);let end=0;for(let i=0;i<count;i++)if(valid[i])queue[end++]=i;const seeds=end;
 for(let start=0;start<end;start++){const i=queue[start],x=i%width,y=Math.floor(i/width);for(const n of [x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1])if(n>=0&&!valid[n]&&charts[n]===charts[i]){rgba.set(rgba.subarray(i*4,i*4+4),n*4);valid[n]=1;queue[end++]=n;}}
 return{measuredTexels:seeds,dilatedTexels:end-seeds,unfilledTexels:count-end};
}
