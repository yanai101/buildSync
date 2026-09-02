const l = {
  issues: undefined,
  activities: [{status: 'delayed'}]
};

const filterIssue = 'delay';

const filterFn = (l) => {
  if (filterIssue === 'delay' && !l.issues?.some((iss) => iss.type === 'delay') && !l.activities?.some((act) => act.status === 'delayed')) return false;
  return true;
};

console.log(filterFn(l));
