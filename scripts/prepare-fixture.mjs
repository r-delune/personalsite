import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const feed = JSON.parse(readFileSync('src/fixtures/showcase.sample.json', 'utf8'));
assert(Array.isArray(feed.albums), 'Fixture must contain upstream albums');
const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function boundaries(t) {
  if(t.section_times_source !== 'manual' || !Array.isArray(t.section_times)) return [];
  const duration=t.duration_seconds, hasDuration=Number.isFinite(duration)&&duration>0;
  const cleaned=[];
  for(const n of [...t.section_times].filter(n=>Number.isFinite(n)&&n>(hasDuration?8:0)&&n<=(hasDuration?Math.max(8,duration-8):Infinity)).sort((a,b)=>a-b)) if(!cleaned.length||n-cleaned[cleaned.length-1]>=.75)cleaned.push(n);
  return hasDuration&&cleaned.length===1&&(cleaned[0]<15||duration-cleaned[0]<15)?[]:cleaned;
}
const tracks = [];
const seen = new Set();
for (const album of feed.albums) {
  assert(typeof album.name === 'string');
  assert(Array.isArray(album.tracks));
  if (album.active === false) continue;
  for (const track of album.tracks) {
    if (track.is_published !== true) continue;
    assert(Number.isInteger(track.id), 'Published tracks require a stable numeric id');
    assert(typeof track.title === 'string');
    assert(track.format === 'mp3', `Published ${track.id} must be an MP3`);
    assert(typeof track.r2_url === 'string' && new URL(track.r2_url).protocol === 'https:', `Published ${track.id} requires an upstream r2_url`);
    assert(!seen.has(track.id), `Duplicate track id ${track.id}`);
    seen.add(track.id);
    tracks.push({peaksUrl:null,boundariesSec:boundaries(track),bpm:Number.isFinite(track.bpm)?track.bpm:null,beatStartAtSec:Number.isFinite(track.beat_start_at)?track.beat_start_at:null,id:String(track.id),title:track.title,artist:album.artist_name || '',src:track.r2_url,duration:track.duration_seconds || 0,artwork:`/artwork/${slug(album.name)}.jpg`,href:`/music/${slug(album.name)}`});
  }
}
assert(tracks.length > 0, 'Fixture must contain playable tracks');
// Only this minimal, published-media projection may enter the client bundle.
// Raw notes, credits, unpublished tracks and ingestion fields remain server-side.
writeFileSync('src/fixtures/playable-tracks.json', JSON.stringify(tracks, null, 2) + '\n');
console.log(`Prepared ${tracks.length} eligible tracks for the preview player.`);
