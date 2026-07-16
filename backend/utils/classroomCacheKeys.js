const { cacheKey } = require('./cache');

function classesKey(branchFilter) {
  // branchFilter is an object; include it in cache key.
  return cacheKey('classroom:getClasses', { branchFilter });
}

function sectionsByClassKey(classId, branchFilter) {
  return cacheKey('classroom:getSectionsByClass', { classId, branchFilter });
}

function classroomOptionsKey(branchFilter, role, teacherId) {
  // This endpoint is auth-aware (Admin/SuperAdmin/Teacher) and branch-aware.
  return cacheKey('classroom:getClassroomOptions', { branchFilter, role, teacherId });
}

module.exports = { classesKey, sectionsByClassKey, classroomOptionsKey };

