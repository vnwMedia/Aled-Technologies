export const START_DATE = '2026-11-02';
export const TIMES = Array.from({length:10},(_,i)=>{const m=510+i*30,h=Math.floor(m/60);return `${h%12||12}:${String(m%60).padStart(2,'0')} ${h<12?'AM':'PM'}`});
export function validDate(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');
 return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10)===value && value>=START_DATE && value>=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
export function normalizeApartment(value:string){return value.toUpperCase().replace(/[^A-Z0-9]/g,'')}
export function validateBooking(b:any):string|null {
 if(!b||typeof b!=='object')return 'Invalid request.';
 if(!validDate(b.date))return 'Choose a valid date on or after November 2, 2026, that is not in the past.';
 if(!Number.isInteger(b.slot)||b.slot<0||b.slot>9)return 'Choose one of the 10 appointment times.';
 for(const key of ['name','apartment','email','phone','requestKey'])if(typeof b[key]!=='string')return 'Please complete all required fields.';
 if(b.name.trim().length<2||b.name.length>120)return 'Enter your full name (2–120 characters).';
 if(!/^[a-zA-Z0-9 -]{1,20}$/.test(b.apartment.trim())||!normalizeApartment(b.apartment))return 'Enter a valid apartment number.';
 if(!Number.isInteger(b.units)||b.units<1||b.units>100)return 'Number of units must be a whole number from 1 to 100.';
 if(b.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()))return 'Enter a valid email address.';
 if(b.phone.length>40||b.phone.replace(/\D/g,'').length<10||b.phone.replace(/\D/g,'').length>15)return 'Enter a valid phone number.';
 if(!/^[\w-]{16,64}$/.test(b.requestKey))return 'Invalid request identifier. Please refresh and try again.';
 return null;
}
