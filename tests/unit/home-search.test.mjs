import test from 'node:test';
import assert from 'node:assert/strict';
import {homeSearch} from '../../src/home-search.mjs';

const frame = constraints => ({intent:'search',ready:true,target:{category:'coffee_shop'},scope:{type:'area',area:'静安寺'},result_count:{type:'exact',value:10},constraints});
async function run(constraints, area='静安寺') {
  const requests=[];
  const value=frame(constraints);
  value.scope.area=area;
  const search=await homeSearch(value,{city:'上海',anchor:''},async url=>{
    requests.push(new URL(url));
    const pois=url.pathname.endsWith('/text') ? [{name:area,location:area==='静安寺'?'121.445,31.223':'121.437,31.194'}] : [0,100,200,300,439,500,501,null,'',-1,'bad'].map((distance,i)=>({id:String(i),name:'店'+i,distance}));
    return new Response(JSON.stringify({status:'1',pois}));
  },'test');
  return {search,requests};
}
test('200、300、500米实际参数、边界过滤和摘要一致',async()=>{
  for(const radius of [200,300,500]){
    const {search,requests}=await run([{field:'distance',op:'lte',value:radius,unit:'m'}]);
    assert.equal(requests[1].searchParams.get('radius'),String(radius));
    assert.equal(requests[1].searchParams.get('location'),'121.445,31.223');
    assert.deepEqual(search.places.map(p=>p.distance),[0,100,200,300,439,500].filter(d=>d<=radius));
    assert.deepEqual(search.places.map(p=>p.ordinal),search.places.map((_,i)=>i+1));
    assert.ok(search.message.includes(`周边 ${radius} 米`));
    assert.ok(!search.message.includes('尚未核验'));
  }
});
test('默认3公里、1公里改2公里，以及更换地标',async()=>{
  for(const [value,expected] of [[null,'3000'],[1,'1000'],[2,'2000']]){
    const {requests}=await run(value===null?[]:[{field:'distance',op:'lte',value,unit:'km'}]);
    assert.equal(requests[1].searchParams.get('radius'),expected);
  }
  const {requests}=await run([{field:'distance',op:'lte',value:2,unit:'km'}],'徐家汇');
  assert.equal(requests[1].searchParams.get('location'),'121.437,31.194');
  assert.equal(requests[1].searchParams.get('radius'),'2000');
});
test('严格小于保留边界区别，多个上限取交集，偏好不改变硬半径',async()=>{
  const {search,requests}=await run([{field:'distance',op:'lt',value:200,unit:'m'},{field:'distance',op:'lte',value:0.3,unit:'km'}]);
  assert.equal(requests[1].searchParams.get('radius'),'200');
  assert.deepEqual(search.places.map(p=>p.distance),[0,100]);
  const other=await run([{field:'wait_time',op:'lte',value:200,unit:'m'}]);
  assert.equal(other.requests[1].searchParams.get('radius'),'3000');
  assert.ok(other.search.message.includes('尚未核验'));
});
test('无中心、无效单位和超出接口范围时不忽略用户距离',async()=>{
  for(const [value,unit,area] of [[200,'m',''],[200,'min','静安寺'],[51,'km','静安寺']]){
    const {search,requests}=await run([{field:'distance',op:'lte',value,unit}],area);
    assert.equal(requests.length,0);
    assert.equal(search.places.length,0);
    assert.ok(search.message);
  }
});
