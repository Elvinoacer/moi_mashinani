import assert from 'node:assert/strict';
import {CATEGORIES} from '../src/lib/categories';
import {enrollmentTemplate,templateSuggestions,suggestedEnrollmentCopy,hoursPreset,ENROLLMENT_DAYS} from '../src/lib/enrollment-templates';

assert.ok(CATEGORIES.length>=60,'The template library covers all campus business groups');
for(const category of CATEGORIES){
  const template=enrollmentTemplate(category.slug);
  assert.ok(template.items.length>=2,'Template suggestions exist for '+category.slug);
  assert.equal(template.title,category.name);
  assert.ok(template.items.every(item=>item.name.trim().length>2));
  assert.ok(templateSuggestions(category.slug,template.items[0].name).length>0);
  const a=suggestedEnrollmentCopy(category.slug,'Campus Shop '+category.slug,'kesses-centre',[]);
  const b=suggestedEnrollmentCopy(category.slug,'Campus Shop '+category.slug,'kesses-centre',['Chapati','Beans'],1);
  assert.ok(a.description.length>=20&&a.tagline.length<=160);
  assert.ok(a.description.includes('Campus Shop'));
  assert.ok(!a.description.toLowerCase().includes('guaranteed')&&!a.description.toLowerCase().includes('licensed'));
  assert.ok(b.description.includes('Chapati'));
}
for(const preset of ['standard','everyday','late','appointment'] as const){
  const hours=hoursPreset(preset);
  assert.equal(Object.keys(hours).length,7);
  assert.ok(ENROLLMENT_DAYS.every(day=>hours[day].open&&hours[day].close));
}
console.log('PASS all '+CATEGORIES.length+' category templates, editable copy suggestions, and bulk opening-hour presets');
