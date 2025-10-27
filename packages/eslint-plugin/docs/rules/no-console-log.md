# no-console-log

Disallow the use of `console.log` statements in production code.

## Rule Details

Using `console.log` in production code is generally considered a code smell. It:

- ⚠️ Clutters the browser console
- 🔒 May leak sensitive information
- 🐛 Often indicates debugging code left behind
- ⚡ Can impact performance

Instead, use a proper logging library that provides:
- Log levels (debug, info, warn, error)
- Structured logging
- Environment-based configuration
- Log aggregation capabilities

## Examples

### ❌ Incorrect

```typescript
function processData(data: any) {
  console.log('Processing data:', data);
  return data.map(item => item * 2);
}

class UserService {
  getUser(id: string) {
    console.log('Fetching user:', id);
    return this.db.users.find(id);
  }
}
```

### ✅ Correct

```typescript
import { logger } from './logger';

function processData(data: any) {
  logger.debug('Processing data:', { data });
  return data.map(item => item * 2);
}

class UserService {
  getUser(id: string) {
    this.logger.debug('Fetching user', { userId: id });
    return this.db.users.find(id);
  }
}
```

## When Not To Use It

You might want to disable this rule if:

- 🧪 You're working on a quick prototype
- 📝 You're in a learning/tutorial context
- 🔧 You have other linting rules that handle logging

## Options

This rule has no options.

## Further Reading

- [MDN: Console](https://developer.mozilla.org/en-US/docs/Web/API/Console)
- [Why console.log is bad](https://blog.logrocket.com/best-practices-logging-node-js/)

