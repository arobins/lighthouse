/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FontDisplayAudit = require('../../audits/font-display.js');
const assert = require('assert');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */

describe('Performance: Font Display audit', () => {
  let networkRecords;
  let stylesheet;
  let context;

  beforeEach(() => {
    stylesheet = {content: ''};
    context = {computedCache: new Map()};
  });

  function getArtifacts() {
    return {
      devtoolsLogs: {[FontDisplayAudit.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: 'https://example.com/foo/bar/page'},
      CSSUsage: {stylesheets: [stylesheet]},
    };
  }

  it('fails when not all fonts have a correct font-display rule', async () => {
    stylesheet.content = `
      @font-face {
        /* try with " */
        src: url("./font-a.woff");
      }

      @font-face {
        /* try up a directory with ' */
        src: url('../font-b.woff');
      }

      @font-face {
        /* try no path with no quotes ' */
        src: url(font.woff);
      }
    `;

    networkRecords = [
      {
        url: 'https://example.com/foo/bar/font-a.woff',
        endTime: 3, startTime: 1,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/font-b.woff',
        endTime: 5, startTime: 1,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/bar/font.woff',
        endTime: 2, startTime: 1,
        resourceType: 'Font',
      },
    ];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    const items = [
      {url: networkRecords[0].url, wastedMs: 2000},
      {url: networkRecords[1].url, wastedMs: 3000},
      {url: networkRecords[2].url, wastedMs: 1000},
    ];
    assert.strictEqual(result.rawValue, false);
    assert.deepEqual(result.details.items, items);
  });

  it('passes when all fonts have a correct font-display rule', async () => {
    stylesheet.content = `
      @font-face {
        font-display: 'block';
        /* try with " */
        src: url("./font-a.woff");
      }

      @font-face {
        font-display: 'fallback';
        /* try up a directory with ' */
        src: url('../font-b.woff');
      }

      @font-face {
        font-display: 'optional';
        /* try no path with no quotes ' */
        src: url(font.woff);
      }
    `;

    networkRecords = [
      {
        url: 'https://example.com/foo/bar/font-a.woff',
        endTime: 3, startTime: 1,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/font-b.woff',
        endTime: 5, startTime: 1,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/bar/font.woff',
        endTime: 2, startTime: 1,
        resourceType: 'Font',
      },
    ];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    assert.strictEqual(result.rawValue, true);
    assert.deepEqual(result.details.items, []);
  });

  it('should handle real-world font-face declarations', async () => {
    /* eslint-disable max-len, no-useless-escape */
    stylesheet.content = `
      @font-face{font-family:CNN Clock;src:url(//edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.eot) format("embedded-opentype"),url(//edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.woff2) format("woff2"),url(//edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.woff) format("woff"),url(//edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.ttf) format("truetype");font-weight:900;font-style:normal}
      @font-face{font-family:FAVE-CNN;src:url(
        "//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.eot")
        ;src:       url("//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.eot?#iefix") format("embedded-opentype"),url("//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.woff") format("woff"),url("//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.ttf") format("truetype"),url("//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.svg?#cnn-icons") format("svg");font-weight:700;font-style:normal}
      @font-face{font-family:\'FontAwesome\';src:url(\'../fonts/fontawesome-webfont.eot?v=4.6.1\');src:url(\'../fonts/fontawesome-webfont.eot?#iefix&v=4.6.1\') format(\'embedded-opentype\'),url(\'../fonts/fontawesome-webfont.woff2?v=4.6.1\') format(\'woff2\'),url(\'../fonts/fontawesome-webfont.woff?v=4.6.1\') format(\'woff\'),url(\'../fonts/fontawesome-webfont.ttf?v=4.6.1\') format(\'truetype\'),url(\'../fonts/fontawesome-webfont.svg?v=4.6.1#fontawesomeregular\') format(\'svg\');font-weight:normal;font-style:normal;font-display:swap;}
      @font-face {   font-family: \'Lato\';   font-style: normal;   font-weight: 900;   src: local(\'Lato Black\'), local(\'Lato-Black\'), url(https://fonts.gstatic.com/s/lato/v14/S6u9w4BMUTPHh50XSwiPGQ3q5d0.woff2) format(\'woff2\');   unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
    `;
    /* eslint-enable max-len, no-useless-escape */

    networkRecords = [
      {
        url: 'https://edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.woff2',
        startTime: 1, endTime: 5,
        resourceType: 'Font',
      },
      {
        url: 'https://registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.woff',
        startTime: 1, endTime: 5,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/fonts/fontawesome-webfont.woff2?v=4.6.1',
        startTime: 1, endTime: 5,
        resourceType: 'Font',
      },
      {
        url: 'https://fonts.gstatic.com/s/lato/v14/S6u9w4BMUTPHh50XSwiPGQ3q5d0.woff2',
        startTime: 1, endTime: 5,
        resourceType: 'Font',
      },
    ];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    assert.strictEqual(result.rawValue, false);
    assert.deepEqual(result.details.items.map(item => item.url), [
      'https://edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.woff2',
      'https://registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.woff',
      // FontAwesome should pass
      // 'https://example.com/foo/fonts/fontawesome-webfont.woff2?v=4.6.1',
      'https://fonts.gstatic.com/s/lato/v14/S6u9w4BMUTPHh50XSwiPGQ3q5d0.woff2',
    ]);
  });
});
