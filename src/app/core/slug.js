// slug.js: the lab and lesson address. It must never change: progress, deep links and the lesson pages
// use it, and tests/sitepages.cjs checks this exact line.
(function (L4N) {
  'use strict';
  const slug=s=>String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  L4N.slug = slug;
  // A slug from outside (URL, storage, a message) must look like one before it is even looked up.
  L4N.isSlug = s => typeof s === 'string' && s.length > 0 && s.length <= 100 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
})(window.L4N = window.L4N || {});
