import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword, validateNewStudent } from '../src/validation.js';

test('passwords need 8+ characters with a letter and a number', () => {
  assert.equal(checkPassword('Abc12345'), null);
  assert.match(checkPassword('short1')!, /at least 8/);
  assert.match(checkPassword('lettersonly')!, /letter and one number/);
  assert.match(checkPassword('1234567890')!, /letter and one number/);
  assert.match(checkPassword(undefined)!, /at least 8/);
});

const validStudent = {
  studentNumber: 'STU-90001',
  name: 'Test Student',
  email: 'Test.Student@Example.com',
  programme: 'Mathematics Track',
  yearOfStudy: 2,
  advisorId: null,
  features: {
    age: 17, sex: 'F', studytime: 2, failures: 0, schoolsup: false, famsup: true, paid: false, activities: true,
    higher: true, internet: true, romantic: false, famrel: 4, freetime: 3, goout: 3, dalc: 1, walc: 2, health: 5,
    absences: 4, medu: 3, fedu: 2, g1: 12, g2: 13, g3: 13,
  },
};

test('a complete, in-range student is accepted and the email is lower-cased', () => {
  const result = validateNewStudent(validStudent);
  assert.ok('value' in result);
  assert.equal(result.value.email, 'test.student@example.com');
});

test('out-of-range features are rejected with the field named', () => {
  const result = validateNewStudent({ ...validStudent, features: { ...validStudent.features, g2: 21, dalc: 0 } });
  assert.ok('errors' in result);
  assert.ok(result.errors.includes('features.g2 must be an integer from 0 to 20'));
  assert.ok(result.errors.includes('features.dalc must be an integer from 1 to 5'));
});

test('wrong types and missing identity fields are all reported together', () => {
  const result = validateNewStudent({ ...validStudent, name: ' ', email: 'not-an-email', features: { ...validStudent.features, internet: 'yes', sex: 'X' } });
  assert.ok('errors' in result);
  assert.ok(result.errors.includes('name is required'));
  assert.ok(result.errors.includes('email is not a valid address'));
  assert.ok(result.errors.includes('features.internet must be true or false'));
  assert.ok(result.errors.includes("features.sex must be 'F' or 'M'"));
});

test('a missing body is rejected, not thrown on', () => {
  const result = validateNewStudent(undefined);
  assert.ok('errors' in result);
  assert.ok(result.errors.length > 10);
});
