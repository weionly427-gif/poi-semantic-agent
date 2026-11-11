import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';

const labels = new Map(JSON.parse(readFileSync(new URL('./kinds.json', import.meta.url))).items.map(item => [item.key, item.label.split('/')[0]]));
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
    const result = await query(center ? 'around' : 'text', {keywords, show_fields:"business,children", page_size:String(limit), ...(center ? {location:center.location, radius:'3000', sortrule:'weight'} : {})});
    if (result.error) return empty(result.error);
    const version = randomUUID();
    const places = result.pois.filter(p => p.id && p.name).slice(0,limit).map((p,i) => ({
      candidate_id:p.id, list_version:version, ordinal:i+1, name:p.name,
      address:[p.cityname,p.adname,p.address].filter(s=>typeof s==='string').join(''),
      category:typeof p.type==='string' ? p.type.split(';').pop() : '',
      rating:typeof p.business?.rating==='string' ? p.business.rating : '',
      hours:p.business?.opentime_today,
      cost:p.business?.cost,
      phone:p.business?.tel,
      parking:p.business?.parking_type,
      facilities:(Array.isArray(p.children) ? p.children : []).filter(c=>typeof c.name==='string' && /停车|卫生间|洗手间|充电|无障碍/.test(c.name+' '+(c.subtype||''))).map(c=>c.name).slice(0,8),
      distance:p.distance && Number.isFinite(Number(p.distance)) ? Number(p.distance) : null
    }));
    const area = center ? city + ' · ' + center.name + '周边 3 公里' : city;
    return {places, message:area + (places.length ? ' · 高德综合排序' : ' · 未找到匹配地点') + (places.length && (frame.constraints?.length || frame.preferences?.length) ? '；附加条件尚未核验' : '')};
  } catch { return empty('暂时无法连接高德，请稍后重试。'); }
}
