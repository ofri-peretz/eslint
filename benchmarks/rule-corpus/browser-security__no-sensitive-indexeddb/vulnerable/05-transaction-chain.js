/**
 * VULNERABLE - The whole chain inline, no binding at all.
 */
db.transaction('kyc', 'readwrite').objectStore('kyc').add({ ssn: applicant.nationalId });
