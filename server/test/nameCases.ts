// Add names here to try them. Each list is checked by `npm test` (and shown by `npm run names`).
// A name in `blocked` must be refused; a name in `allowed` must be accepted.
export const blocked: string[] = [
  'shit', 'SHIT', 'sh1t', 'f u c k', 's.h.i.t', 'b_i_t_c_h', 'fuuuuck', '@sshole', 'n1gger',
  'DumbAssHole', 'xXfuckXx', 'Bullshit99', 'Jack Ass', 'Dick Tracy', // "Dick" is a real name, but the package blocks it; we accept that tradeoff
];
export const allowed: string[] = [
  'Crab Cake', "O'Malley", 'Mr. T', 'Queen_City-1', 'José', 'Scunthorpe', 'Assistant', 'Class',
  'Charlotte', 'Baltimore', 'Uptown', 'NoDa', 'Hancock', 'Cassandra', 'Bassett',
  'Hello World', 'Passenger', 'Analyst', 'Peacock', 'Cockatoo',
];
export const badShape: string[] = [
  '', ' ', 'a', 'a'.repeat(21), '<b>hi</b>', "x'); DROP TABLE users;--", '${jndi:ldap}', '../../etc/passwd',
  '{"$ne":1}', 'a=b', 'name;rm', 'tab\tname',
];
