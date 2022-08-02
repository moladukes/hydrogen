import type {ImportGlobEagerOutput} from '../../types.js';
import {createRoutes} from '../routes.js';

describe('Page routes', () => {
  const STUB_MODULE = {default: {}, api: null};

  it('converts normal pages to routes', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({
      files,
      basePath: '*',
      dirPrefix: './routes',
    });

    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
    ]);
  });

  it('handles index pages', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/',
        resource: STUB_MODULE,
        exact: true,
      },
    ]);
  });

  it('handles nested index pages', () => {
    const files: ImportGlobEagerOutput = {
      './routes/products/index.server.jsx': STUB_MODULE,
      './routes/products/[handle].server.jsx': STUB_MODULE,
      './routes/blogs/index.server.jsx': STUB_MODULE,
      './routes/products/snowboards/fastones/index.server.jsx': STUB_MODULE,
      './routes/articles/index.server.jsx': STUB_MODULE,
      './routes/articles/[...handle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/products',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/blogs',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/products/snowboards/fastones',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/articles',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/products/:handle',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/articles/:handle',
        resource: STUB_MODULE,
        exact: false,
      },
    ]);
  });

  it('handles dynamic paths', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
      './routes/products/[handle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});
    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/products/:handle',
        resource: STUB_MODULE,
        exact: true,
      },
    ]);
  });

  it('handles catch all routes', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
      './routes/products/[...handle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});
    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/products/:handle',
        resource: STUB_MODULE,
        exact: false,
      },
    ]);
  });

  it('handles nested dynamic paths', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
      './routes/products/[handle].server.jsx': STUB_MODULE,
      './routes/blogs/[handle]/[articleHandle].server.jsx': STUB_MODULE,
      './routes/blogs/[handle]/[...articleHandle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/products/:handle',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/blogs/:handle/:articleHandle',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/blogs/:handle/:articleHandle',
        resource: STUB_MODULE,
        exact: false,
      },
    ]);
  });

  it('prioritizes overrides next to dynamic paths', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
      './routes/products/[handle].server.jsx': STUB_MODULE,
      // Alphabetically, `hoodie` will likely come after `[handle]`
      './routes/products/hoodie.server.jsx': STUB_MODULE,
      './routes/blogs/[handle]/[articleHandle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/',
        resource: STUB_MODULE,
        exact: true,
      },
      // But in the routes, it needs to come first!
      {
        path: '/products/hoodie',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/products/:handle',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/blogs/:handle/:articleHandle',
        resource: STUB_MODULE,
        exact: true,
      },
    ]);
  });

  it('handles typescript paths', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.tsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/',
        resource: STUB_MODULE,
        exact: true,
      },
    ]);
  });

  it('lowercases routes', () => {
    const files: ImportGlobEagerOutput = {
      './routes/Contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/',
        resource: STUB_MODULE,
        exact: true,
      },
    ]);
  });

  it('factors in the top-level path prefix', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({
      files,
      basePath: '/foo/*',
      dirPrefix: './routes',
    });

    expect(routes).toEqual([
      {
        path: '/foo/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/foo/',
        resource: STUB_MODULE,
        exact: true,
      },
    ]);
  });

  it('uses a custom file directory path', () => {
    const files: ImportGlobEagerOutput = {
      './custom/contact.server.jsx': STUB_MODULE,
      './custom/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './custom'});

    expect(routes).toEqual([
      {
        path: '/contact',
        resource: STUB_MODULE,
        exact: true,
      },
      {
        path: '/',
        resource: STUB_MODULE,
        exact: true,
      },
    ]);
  });
});

describe('API routes', () => {
  const STUB_MODULE = {default: null, api: {}};

  it('converts API functions to routes', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        exact: true,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('handles index API routes', () => {
    const files: ImportGlobEagerOutput = {
      './routes/index.server.jsx': STUB_MODULE,
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/api/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/contact',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/api',
        exact: true,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('handles nested index API routes', () => {
    const files: ImportGlobEagerOutput = {
      './routes/products/index.server.jsx': STUB_MODULE,
      './routes/products/[handle].server.jsx': STUB_MODULE,
      './routes/blogs/index.server.jsx': STUB_MODULE,
      './routes/products/snowboards/fastones/index.server.jsx': STUB_MODULE,
      './routes/articles/index.server.jsx': STUB_MODULE,
      './routes/articles/[...handle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/products',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/blogs',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/products/snowboards/fastones',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/articles',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/products/:handle',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/articles/:handle',
        exact: false,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('handles dynamic paths', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
      './routes/products/[handle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});
    expect(routes).toEqual([
      {
        path: '/contact',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/products/:handle',
        exact: true,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('handles catch all routes', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
      './routes/products/[...handle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});
    expect(routes).toEqual([
      {
        path: '/contact',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/products/:handle',
        exact: false,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('handles nested dynamic paths', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
      './routes/products/[handle].server.jsx': STUB_MODULE,
      './routes/blogs/[handle]/[articleHandle].server.jsx': STUB_MODULE,
      './routes/blogs/[handle]/[...articleHandle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/products/:handle',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/blogs/:handle/:articleHandle',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/blogs/:handle/:articleHandle',
        exact: false,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('prioritizes overrides next to dynamic paths', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
      './routes/products/[handle].server.jsx': STUB_MODULE,
      // Alphabetically, `hoodie` will likely come after `[handle]`
      './routes/products/hoodie.server.jsx': STUB_MODULE,
      './routes/blogs/[handle]/[articleHandle].server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/',
        exact: true,
        resource: STUB_MODULE,
      },
      // But in the routes, it needs to come first!
      {
        path: '/products/hoodie',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/products/:handle',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/blogs/:handle/:articleHandle',
        exact: true,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('handles typescript paths', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.tsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/',
        exact: true,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('lowercases routes', () => {
    const files: ImportGlobEagerOutput = {
      './routes/Contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({files, dirPrefix: './routes'});

    expect(routes).toEqual([
      {
        path: '/contact',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/',
        exact: true,
        resource: STUB_MODULE,
      },
    ]);
  });

  it('factors in the top-level path prefix', () => {
    const files: ImportGlobEagerOutput = {
      './routes/contact.server.jsx': STUB_MODULE,
      './routes/index.server.jsx': STUB_MODULE,
    };

    const routes = createRoutes({
      files,
      basePath: '/foo/*',
      dirPrefix: './routes',
    });

    expect(routes).toEqual([
      {
        path: '/foo/contact',
        exact: true,
        resource: STUB_MODULE,
      },
      {
        path: '/foo/',
        exact: true,
        resource: STUB_MODULE,
      },
    ]);
  });
});
