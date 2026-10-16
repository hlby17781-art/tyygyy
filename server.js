const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json({limit:'2mb'}));
const port = process.env.PORT || 10000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
app.use(express.static(path.join(__dirname,'public')));
function bad(res,msg){return res.status(400).json({error:msg})}
app.get('/api/health',(req,res)=>res.json({ok:true,service:'aeroguard-cloud',time:new Date().toISOString()}));
app.get('/api/devices',async(req,res)=>{const {data,error}=await supabase.from('devices').select('*').order('name'); if(error)return res.status(500).json({error:error.message}); res.json({devices:data||[]})});
app.get('/api/locations',async(req,res)=>{const {data,error}=await supabase.from('devices').select('id,name,last_seen,latitude,longitude,accuracy,battery').not('latitude','is',null).not('longitude','is',null).order('last_seen',{ascending:false}); if(error)return res.status(500).json({error:error.message}); res.json({locations:data||[]})});
app.get('/api/records',async(req,res)=>{const {data,error}=await supabase.from('records').select('*').order('created_at',{ascending:false}).limit(500); if(error)return res.status(500).json({error:error.message}); res.json({records:data||[]})});
app.post('/api/device/register',async(req,res)=>{const {id,name,metadata={}}=req.body||{}; if(!id)return bad(res,'device id required'); const {error}=await supabase.from('devices').upsert({id,name:name||id,last_seen:new Date().toISOString(),metadata}); if(error)return res.status(500).json({error:error.message}); res.json({ok:true,device_id:id})});
app.post('/api/location',async(req,res)=>{const b=req.body||{}; if(!b.device_id||b.latitude==null||b.longitude==null)return bad(res,'device_id, latitude and longitude required'); const t=new Date().toISOString(); let q=await supabase.from('devices').upsert({id:b.device_id,name:b.name||b.device_id,last_seen:t,latitude:Number(b.latitude),longitude:Number(b.longitude),accuracy:b.accuracy==null?null:Number(b.accuracy),battery:b.battery==null?null:Number(b.battery)}); if(q.error)return res.status(500).json({error:q.error.message}); q=await supabase.from('records').insert({device_id:b.device_id,kind:'location',payload:b,created_at:t}); if(q.error)return res.status(500).json({error:q.error.message}); res.json({ok:true,received_at:t})});
app.post('/api/record',async(req,res)=>{const b=req.body||{}; const id=b.device_id||'unknown'; const {error}=await supabase.from('records').insert({device_id:id,kind:String(b.kind||'data'),payload:b.data||b}); if(error)return res.status(500).json({error:error.message}); res.status(201).json({ok:true})});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(port,()=>console.log(`AEROGUARD cloud server listening on ${port}`));
