import { Student, Course, Enrollment, Attendance, Grade } from '../models/index.js';
export async function reports() {
  const [students,activeStudents,courses,enrollments,departments,years,enrollmentTrends,attendance,performance,courseEnrollments,recentStudents]=await Promise.all([
    Student.countDocuments(),Student.countDocuments({status:'active'}),Course.countDocuments(),Enrollment.countDocuments({status:{$ne:'withdrawn'}}),
    Student.aggregate([{$group:{_id:'$department',count:{$sum:1}}},{$sort:{_id:1}}]),
    Student.aggregate([{$group:{_id:'$academicYear',count:{$sum:1}}},{$sort:{_id:1}}]),
    Enrollment.aggregate([{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$createdAt'}},count:{$sum:1}}},{$sort:{_id:1}}]),
    Attendance.aggregate([{$group:{_id:'$course',recorded:{$sum:1},attended:{$sum:{$cond:[{$in:['$status',['present','late']]},1,0]}}}},{$lookup:{from:'courses',localField:'_id',foreignField:'_id',as:'course'}},{$unwind:'$course'},{$project:{course:'$course.name',department:'$course.department',recorded:1,attended:1,percentage:{$multiply:[{$divide:['$attended','$recorded']},100]}}}]),
    Grade.aggregate([{$group:{_id:'$course',marks:{$sum:'$marks'},maxMarks:{$sum:'$maxMarks'},assessments:{$sum:1}}},{$lookup:{from:'courses',localField:'_id',foreignField:'_id',as:'course'}},{$unwind:'$course'},{$project:{course:'$course.name',marks:1,maxMarks:1,assessments:1,percentage:{$multiply:[{$divide:['$marks','$maxMarks']},100]}}}]),
    Enrollment.aggregate([{$match:{status:{$ne:'withdrawn'}}},{$group:{_id:'$course',count:{$sum:1}}},{$lookup:{from:'courses',localField:'_id',foreignField:'_id',as:'course'}},{$unwind:'$course'},{$project:{course:'$course.name',count:1}}]),
    Student.find().sort({createdAt:-1}).limit(5).select('firstName lastName studentId createdAt').lean()
  ]);
  const recorded=attendance.reduce((n,r)=>n+r.recorded,0), attended=attendance.reduce((n,r)=>n+r.attended,0);
  return {metrics:{students,activeStudents,courses,enrollments,attendancePercentage:recorded?attended/recorded*100:null},departments,years,enrollmentTrends,attendance,performance,courseEnrollments,recentStudents};
}
export const gradeLabel=(percentage,thresholds)=>[...thresholds].sort((a,b)=>b.minimum-a.minimum).find(t=>percentage>=t.minimum)?.label ?? '—';
export function csv(rows) {
  const keys=rows.length?Object.keys(rows[0]).filter(k=>k!=='_id'):[];
  const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
  return '\uFEFF'+[keys.map(cell).join(','),...rows.map(row=>keys.map(k=>cell(row[k])).join(','))].join('\r\n');
}
