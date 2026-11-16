import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {Admin,Student,Course,Enrollment,Attendance,Grade} from '../src/models/index.js';
import {initAdmin} from '../scripts/admin.js';
import {seed} from '../scripts/seed.js';
import {csv,gradeLabel} from '../src/services/reports.js';
let mongo,app,token,student,course,enrollment,attendance,grade;
const email='admin@example.test',password='A-secure-test-password-123';
const studentData={studentId:'S-001',rollNumber:'R-001',firstName:'Taylor',lastName:'Example',email:'taylor@example.test',department:'Computing',academicYear:'2026-2027',semester:1,batch:'2026',section:'A',status:'active'};
const courseData={code:'CS101',name:'Computing basics',department:'Computing',academicYear:'2026-2027',semester:1,credits:3,facultyName:'Dr Example'};
const auth=()=>({Authorization:'Bearer '+token});
beforeAll(async()=>{
  mongo=await MongoMemoryServer.create({binary:{version:'7.0.24'}});
  await mongoose.connect(mongo.getUri('campusdesk_test'));
  await Promise.all(Object.values(mongoose.models).map(m=>m.init()));
  app=createApp({secret:'test-secret-with-at-least-32-characters',logging:false});
  await initAdmin({email,password});await initAdmin({email,password});
},120000);
afterAll(async()=>{await mongoose.disconnect();await mongo?.stop();});
describe('Authentication and readiness',()=>{
  it('reports actual database readiness',async()=>{const r=await request(app).get('/api/health');expect(r.status).toBe(200);expect(r.body.database).toBe('connected');});
  it('creates the administrator idempotently and hashes its password',async()=>{expect(await Admin.countDocuments()).toBe(1);expect((await Admin.findOne().select('+passwordHash')).passwordHash).not.toContain(password);});
  it('rejects anonymous API access and invalid login',async()=>{expect((await request(app).get('/api/students')).status).toBe(401);expect((await request(app).post('/api/auth/login').send({email,password:'wrong'})).status).toBe(401);});
  it('logs in and returns a short-lived bearer token',async()=>{const r=await request(app).post('/api/auth/login').send({email,password});expect(r.status).toBe(200);token=r.body.token;expect(r.body.expiresIn).toBe(900);expect((await request(app).get('/api/auth/me').set(auth())).body.email).toBe(email);});
  it('enforces configured CORS',async()=>{const ok=await request(app).get('/api/health').set('Origin','http://localhost:5173');expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');const no=await request(app).get('/api/health').set('Origin','https://evil.example');expect(no.headers['access-control-allow-origin']).toBeUndefined();});
});
describe('Students and courses',()=>{
  it('creates and retrieves a student',async()=>{const r=await request(app).post('/api/students').set(auth()).send(studentData);expect(r.status).toBe(201);student=r.body;expect((await request(app).get('/api/students/'+student._id).set(auth())).body.firstName).toBe('Taylor');});
  it('rejects duplicate IDs, emails and roll numbers',async()=>{
    for(const changes of [{},{studentId:'S-002'},{studentId:'S-002',rollNumber:'R-002'}])expect((await request(app).post('/api/students').set(auth()).send({...studentData,...changes})).status).toBe(409);
  });
  it('validates input and rejects invalid IDs and unknown resources',async()=>{
    expect((await request(app).post('/api/students').set(auth()).send({...studentData,email:'bad'})).status).toBe(422);
    expect((await request(app).get('/api/students/invalid').set(auth())).status).toBe(422);
    expect((await request(app).get('/api/students/'+new mongoose.Types.ObjectId()).set(auth())).status).toBe(404);
    expect((await request(app).get('/api/missing').set(auth())).status).toBe(404);
  });
  it('supports search, filters, sorting and pagination without regex injection',async()=>{
    await request(app).post('/api/students').set(auth()).send({...studentData,studentId:'S-002',rollNumber:'R-002',email:'second@example.test',firstName:'Avery',department:'Business'});
    const r=await request(app).get('/api/students?sort=firstName&order=asc&limit=1&page=1').set(auth());expect(r.body.total).toBe(2);expect(r.body.pages).toBe(2);expect(r.body.items[0].firstName).toBe('Avery');
    expect((await request(app).get('/api/students?page=2&limit=1&sort=firstName&order=asc').set(auth())).body.items[0].firstName).toBe('Taylor');
    expect((await request(app).get('/api/students?search=taylor&department=Computing&status=active&academicYear=2026-2027').set(auth())).body.total).toBe(1);
    expect((await request(app).get('/api/students?search=%2E%2A').set(auth())).body.total).toBe(0);
  });
  it('updates student details persistently',async()=>{expect((await request(app).put('/api/students/'+student._id).set(auth()).send({...studentData,phone:'555-0100'})).status).toBe(200);expect((await Student.findById(student._id)).phone).toBe('555-0100');});
  it('creates, searches, edits and rejects duplicate courses',async()=>{
    const r=await request(app).post('/api/courses').set(auth()).send(courseData);expect(r.status).toBe(201);course=r.body;
    expect((await request(app).post('/api/courses').set(auth()).send(courseData)).status).toBe(409);
    expect((await request(app).get('/api/courses?search=CS101').set(auth())).body.total).toBe(1);
    expect((await request(app).put('/api/courses/'+course._id).set(auth()).send({...courseData,credits:4})).body.credits).toBe(4);
  });
});
describe('Academic integrity',()=>{
  it('rejects incompatible enrollments and accepts a valid term',async()=>{
    const other=await Student.findOne({department:'Business'});
    expect((await request(app).post('/api/enrollments').set(auth()).send({student:other._id,course:course._id,term:'2026-2027'})).status).toBe(422);
    expect((await request(app).post('/api/enrollments').set(auth()).send({student:student._id,course:course._id,term:'wrong'})).status).toBe(422);
    const r=await request(app).post('/api/enrollments').set(auth()).send({student:student._id,course:course._id,term:'2026-2027'});expect(r.status).toBe(201);enrollment=r.body;
    expect((await request(app).post('/api/enrollments').set(auth()).send({student:student._id,course:course._id,term:'2026-2027'})).status).toBe(409);
  });
  it('protects parent records and compatibility fields',async()=>{
    expect((await request(app).delete('/api/students/'+student._id).set(auth())).status).toBe(409);
    expect((await request(app).put('/api/students/'+student._id).set(auth()).send({...studentData,semester:2})).status).toBe(409);
    expect((await request(app).delete('/api/courses/'+course._id).set(auth())).status).toBe(409);
  });
  it('creates, edits and deduplicates attendance; rejects impossible dates',async()=>{
    const data={student:student._id,course:course._id,date:'2026-11-01',status:'present'};
    expect((await request(app).post('/api/attendance').set(auth()).send({...data,date:'2026-02-30'})).status).toBe(422);
    let r=await request(app).post('/api/attendance').set(auth()).send(data);expect(r.status).toBe(201);attendance=r.body;
    expect((await request(app).post('/api/attendance').set(auth()).send(data)).status).toBe(409);
    r=await request(app).put('/api/attendance/'+attendance._id).set(auth()).send({...data,status:'late'});expect(r.body.status).toBe('late');
    await request(app).post('/api/attendance').set(auth()).send({...data,date:'2026-11-02',status:'absent'});
  });
  it('validates grade boundaries and computes percentage and grade',async()=>{
    const data={student:student._id,course:course._id,term:'2026-2027',assessment:'Midterm',marks:80,maxMarks:100};
    for(const marks of [-1,101])expect((await request(app).post('/api/grades').set(auth()).send({...data,marks})).status).toBe(422);
    const r=await request(app).post('/api/grades').set(auth()).send(data);expect(r.status).toBe(201);grade=r.body;
    expect((await request(app).post('/api/grades').set(auth()).send(data)).status).toBe(409);
    expect((await request(app).put('/api/grades/'+grade._id).set(auth()).send({...data,marks:90})).status).toBe(200);
    const result=(await request(app).get('/api/grades').set(auth())).body.items[0];expect(result.percentage).toBe(90);expect(result.letter).toBe('A');
  });
  it('prevents removing or withdrawing enrollments with academic history',async()=>{
    expect((await request(app).delete('/api/enrollments/'+enrollment._id).set(auth())).status).toBe(409);
    expect((await request(app).put('/api/enrollments/'+enrollment._id).set(auth()).send({student:student._id,course:course._id,term:'2026-2027',status:'withdrawn'})).status).toBe(409);
  });
  it('returns real aggregation outputs and student history',async()=>{
    const r=(await request(app).get('/api/reports').set(auth())).body;
    expect(r.metrics).toEqual({students:2,activeStudents:2,courses:1,enrollments:1,attendancePercentage:50});
    expect(r.attendance[0].recorded).toBe(2);expect(r.performance[0].percentage).toBe(90);
    expect(r.departments).toHaveLength(2);expect(r.courseEnrollments[0].count).toBe(1);expect(r.enrollmentTrends[0].count).toBe(1);
    const h=(await request(app).get('/api/students/'+student._id+'/history').set(auth())).body;
    expect(h.attendancePercentage).toBe(50);expect(h.grades[0].letter).toBe('A');expect(h.enrollments).toHaveLength(1);
  });
  it('exports CSV and escapes spreadsheet formulas',async()=>{
    const r=await request(app).get('/api/reports/attendance.csv').set(auth());expect(r.status).toBe(200);expect(r.text).toContain('Computing basics');
    expect(csv([{name:'=SUM(1)',value:'"quoted"'}])).toContain("'=SUM(1)");expect(csv([{name:'"quoted"'}])).toContain('""quoted""');
  });
  it('allows configuration of valid grade thresholds only',async()=>{
    expect((await request(app).put('/api/auth/thresholds').set(auth()).send({thresholds:[{label:'Pass',minimum:50}]})).status).toBe(422);
    expect((await request(app).put('/api/auth/thresholds').set(auth()).send({thresholds:[{label:'Pass',minimum:50},{label:'Fail',minimum:0}]})).status).toBe(200);
    expect(gradeLabel(75,[{label:'Pass',minimum:50},{label:'Fail',minimum:0}])).toBe('Pass');
  });
  it('deletes in dependency order and persists deletions',async()=>{
    for(const a of await Attendance.find())expect((await request(app).delete('/api/attendance/'+a._id).set(auth())).status).toBe(204);
    expect((await request(app).delete('/api/grades/'+grade._id).set(auth())).status).toBe(204);
    expect((await request(app).delete('/api/enrollments/'+enrollment._id).set(auth())).status).toBe(204);
    expect((await request(app).delete('/api/students/'+student._id).set(auth())).status).toBe(204);
    expect((await request(app).delete('/api/courses/'+course._id).set(auth())).status).toBe(204);
    expect(await Student.findById(student._id)).toBeNull();expect(await Course.findById(course._id)).toBeNull();
  });
});
describe('Session safety and seed repeatability',()=>{
  it('changes passwords and revokes existing sessions',async()=>{
    expect((await request(app).post('/api/auth/password').set(auth()).send({currentPassword:'bad',newPassword:'New-secure-password-123'})).status).toBe(400);
    expect((await request(app).post('/api/auth/password').set(auth()).send({currentPassword:password,newPassword:'New-secure-password-123'})).status).toBe(204);
    expect((await request(app).get('/api/auth/me').set(auth())).status).toBe(401);
    const r=await request(app).post('/api/auth/login').send({email,password:'New-secure-password-123'});token=r.body.token;expect(r.status).toBe(200);
    expect((await request(app).post('/api/auth/logout').set(auth())).status).toBe(204);
    expect((await request(app).get('/api/auth/me').set(auth())).status).toBe(401);
  });
  it('seeds fictional data idempotently',async()=>{
    await seed();await seed();
    expect(await Student.countDocuments({studentId:/^DEMO-/})).toBe(36);expect(await Course.countDocuments()).toBe(6);
    expect(await Enrollment.countDocuments()).toBe(72);expect(await Attendance.countDocuments()).toBe(360);expect(await Grade.countDocuments()).toBe(72);
  },30000);
  it('rate limits repeated authentication failures',async()=>{
    let response;for(let i=0;i<12;i++)response=await request(app).post('/api/auth/login').send({email,password:'wrong'});
    expect(response.status).toBe(429);
  });
});
