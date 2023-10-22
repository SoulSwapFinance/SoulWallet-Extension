# @soul-wallet/extension-base

Functions, classes and other utilities used in `@soul-wallet/extension`. These include:
- background script handlers,
- message passing,
- scripts injected inside pages.

They are primarily meant to be used in `@soul-wallet/extension`, and can be broken without any notice to cater for `@soul-wallet/extension`'s needs.

They are exported here if you wish to use part of them in the development of your own extension. Don't forget to add `process.env.EXTENSION_PREFIX` to separate ports and stores from the current extension's ones.
