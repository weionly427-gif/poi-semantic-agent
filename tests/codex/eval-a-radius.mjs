import {parse} from '../../src/agent.mjs';
import {homeSearch} from '../../src/home-search.mjs';
import {writeFileSync} from 'node:fs';

const results = [];
for (const radius of [200, 300, 500]) {
  const text = `找上海静安寺附近${radius}米以内的咖啡厅。`;
  const row = {text, expected_radius_m: radius, requests: []};
  try {
    row.frame = await parse(text);
    row.search = await homeSearch(row.frame, {city:'上海', anchor:'静安寺'}, async (url, options) => {
      const safe = new URL(url);
      safe.searchParams.delete('key');
      const request = {path:safe.pathname, params:Object.fromEntries(safe.searchParams)};
      row.requests.push(request);
      const response = await fetch(url, options);
      const body = await response.clone().json();
      request.response = {status:body.status, infocode:body.infocode, pois:body.pois};
      return response;
    });
    row.outside_requested_radius = row.search.places.filter(p=>p.distance !== null && p.distance > radius).map(p=>({name:p.name,distance:p.distance}));
  } catch (error) {row.error = error.message;}
  results.push(row);
  writeFileSync(new URL('./results/eval-a-radius-result.json', import.meta.url), JSON.stringify({tested_at:new Date().toISOString(),results}, null, 2));
  console.log(JSON.stringify(row));
}
