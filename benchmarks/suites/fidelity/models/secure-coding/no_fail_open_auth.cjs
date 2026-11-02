const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 98,
  traces: 900,
  rule: 'no-fail-open-auth',
  key: (s) => `${tag(s.call)}|${tag(s.catchBody)}|after=${s.after}`,
  config: () => ({}),
  code: (s) => {
    const call = {
      VerifyToken: 'await verifyToken(req.headers.authorization);',
      AssertAdmin: 'await assertAdmin(req.headers.authorization);',
      IsAuthorized: 'await isAuthorized(req.user);',
      Authenticate: 'await authenticate(req);',
      BareVerify: 'jwt.verify(req.headers.authorization, key);',
      AuthSdkError: 'assertAuthSdkError(req.body);',
      InCallback: 'ids.map((id) => checkPermission(id));',
    }[tag(s.call)];
    const body = {
      ReturnTrue: 'return true;',
      ReturnFalse: 'return false;',
      Empty: '',
      LogOnly: 'console.log(err);',
      Rethrow: 'throw err;',
      NextErr: 'next(err);',
      ReturnObj: 'return { error: err };',
    }[tag(s.catchBody)];
    const after = s.after ? '\n  await purgeTable(req.body.table);' : '';
    return `declare const jwt: any, key: string, ids: string[];\ndeclare function verifyToken(t: string): Promise<any>;\ndeclare function assertAdmin(t: string): Promise<any>;\ndeclare function isAuthorized(u: any): Promise<boolean>;\ndeclare function authenticate(r: any): Promise<any>;\ndeclare function assertAuthSdkError(x: any): void;\ndeclare function checkPermission(id: string): void;\ndeclare function purgeTable(t: string): Promise<void>;\nexport async function handle(req: any, res: any, next: any) {\n  try {\n    ${call}\n  } catch (err) {\n    ${body}\n  }${after}\n}\n`;
  },
};
