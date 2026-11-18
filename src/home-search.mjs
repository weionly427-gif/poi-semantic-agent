import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';

const labels = new Map(JSON.parse(readFileSync(new URL('../rules/kinds.json', import.meta.url))).items.map(item => [item.key, item.label.split('/')[0]]));
const distanceValue = value => (typeof value === 'number' || (typeof value === 'string' && value.trim())) && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const priceTests = {
  gte: (cost, bound) => cost >= bound,
  gt: (cost, bound) => cost > bound,
  lte: (cost, bound) => cost <= bound,
  lt: (cost, bound) => cost < bound,
  eq: (cost, bound) => cost === bound
};
function priceFilter(condition) {
  if (condition.field !== 'price_per_person' || !Object.hasOwn(priceTests, condition.op) ||
      !Number.isFinite(condition.value) || (condition.unit && condition.unit !== 'CNY')) return null;
  return poi => {
    const cost = distanceValue(poi.business?.cost);
    return cost !== null && priceTests[condition.op](cost, condition.value);
  };
}
export async function homeSearch(frame, home, fetcher = fetch, key = process.env.AMAP_WEB_KEY) {
  const empty = message => ({message, places: []});
  if (!frame.ready || !['search', 'modify_search','list'].includes(frame.intent)) return empty('');
  if (['along_route','route_event','destination'].includes(frame.scope?.type)) return empty('首页处于非导航态，请指定附近的地点。');
  if (!key) return empty('尚未配置高德 Web 服务密钥 AMAP_WEB_KEY。');
  const city = frame.scope?.city || home.city.trim();
  if (!city) return empty('请填写测试城市，再提交指令。');
  const target = frame.target || {};
  const keywords = [target.brand, target.name, labels.get(target.category)].filter(Boolean).join(' ') || target.raw;
  if (!keywords || target.any_of) return empty('请指定一种地点再搜索。');
  const anchor = frame.scope?.area || (frame.scope?.city && frame.scope.city !== home.city.trim() ? '' : home.anchor.trim());
  if (!anchor && frame.scope?.type === 'nearby') return empty('请在首页填写当前位置附近的地标，再提交指令。');
  const distanceLimits = (frame.constraints || []).filter(c => c.field === 'distance' && ['lte','lt'].includes(c.op));
  if (distanceLimits.some(c => typeof c.value !== 'number' || !Number.isFinite(c.value) || c.value <= 0 || !['m','km'].includes(c.unit))) return empty('距离上限需要使用有效的米或公里数值。');
  const maxDistance = distanceLimits.length ? Math.min(...distanceLimits.map(c => c.value * (c.unit === 'km' ? 1000 : 1))) : null;
  if (maxDistance !== null && !anchor) return empty('请指定搜索中心地标，才能按距离范围查找。');
  if (maxDistance > 50000) return empty('周边查询暂支持50公里以内的距离上限，请缩小范围。');
  const radius = maxDistance === null ? 3000 : Math.ceil(maxDistance);
  const filters = [];
  const remainingConstraints = [];
  let requiresMichelinEvidence = false;
  for (const condition of frame.constraints || []) {
    if (distanceLimits.includes(condition)) continue;
    let filter = priceFilter(condition);
    const alternatives = condition.any_of;
    if (alternatives?.length === 2 && alternatives.some(c => c.field === 'michelin' && c.op === 'eq' && c.value === true)) {
      const price = alternatives.find(c => c.field === 'price_per_person');
      if (price) filter = priceFilter(price);
      // The current map response supplies no verified Michelin membership.
      if (filter) requiresMichelinEvidence = true;
    }
    if (filter) filters.push(filter);
    else remainingConstraints.push(condition);
  }
  async function query(path, params) {
    const url = new URL('https://restapi.amap.com/v5/place/' + path);
    url.search = new URLSearchParams({key, ...(path === 'text' ? {region:city, city_limit:'true'} : {}), ...params});
    const response = await fetcher(url, {signal:AbortSignal.timeout(7000)});
    if (!response.ok) throw Error();
    const body = await response.json();
    if (body.status !== '1') return {error:'高德查询失败（' + String(body.infocode || '未知错误') + '）'};
    return {pois:body.pois || []};
  }
  try {
    let center;
    if (anchor) {
      const landmark = await query('text', {keywords:anchor, page_size:'1'});
      if (landmark.error) return empty(landmark.error);
      center = landmark.pois[0];
      if (!center?.location) return empty('在' + city + '未找到地标“' + anchor + '”。');
    }
    const limit = Math.min(10, frame.result_count?.value || 5);
    const version = randomUUID();
    const inRange = p => {
      if (!center) return true;
      const distance = distanceValue(p.distance);
      if (distance === null) return maxDistance === null;
      return distance <= radius && distanceLimits.every(c => c.op === 'lt' ? distance < c.value * (c.unit === 'km' ? 1000 : 1) : distance <= c.value * (c.unit === 'km' ? 1000 : 1));
    };
    const candidates = new Map();
    const pageSize = filters.length ? 25 : limit;
    for (let page = 1; page <= (filters.length ? 3 : 1); page++) {
      const result = await query(center ? 'around' : 'text', {
        keywords, show_fields:'business,children', page_size:String(pageSize), page_num:String(page),
        ...(center ? {location:center.location, radius:String(radius), sortrule:'weight'} : {})
      });
      if (result.error) return empty(result.error);
      for (const poi of result.pois) {
        if (poi.id && poi.name && inRange(poi) && filters.every(filter => filter(poi))) candidates.set(poi.id, poi);
      }
      if (candidates.size >= limit || result.pois.length < pageSize) break;
    }
    const places = [...candidates.values()].slice(0,limit).map((p,i) => ({
      candidate_id:p.id, list_version:version, ordinal:i+1, name:p.name,
      address:[p.cityname,p.adname,p.address].filter(s=>typeof s==='string').join(''),
      category:typeof p.type==='string' ? p.type.split(';').pop() : '',
      rating:typeof p.business?.rating==='string' ? p.business.rating : '',
      hours:p.business?.opentime_today,
      cost:p.business?.cost,
      phone:p.business?.tel,
      parking:p.business?.parking_type,
      facilities:(Array.isArray(p.children) ? p.children : []).filter(c=>typeof c.name==='string' && /停车|卫生间|洗手间|充电|无障碍/.test(c.name+' '+(c.subtype||''))).map(c=>c.name).slice(0,8),
      distance:distanceValue(p.distance)
    }));
    const rangeLabel = radius >= 1000 ? radius / 1000 + ' 公里' : radius + ' 米';
    const area = center ? city + ' · ' + center.name + '周边 ' + rangeLabel : city;
    return {places, message:area + (places.length ? ' · 高德综合排序' : (filters.length ? ' · 本次候选中没有可确认符合价格条件的地点' : ' · 未找到匹配地点')) + (requiresMichelinEvidence ? '；无米其林身份数据，仅按人均价格核验' : '') + (places.length && (remainingConstraints.length || frame.preferences?.length) ? '；附加条件尚未核验' : '')};
  } catch { return empty('暂时无法连接高德，请稍后重试。'); }
}
