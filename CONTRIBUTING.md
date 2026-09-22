<!--
SPDX-FileCopyrightText: 2026 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: Apache-2.0
-->

## Sign off

We ask that everybody who contributes to this project signs off their contributions, as explained below.

We follow a simple 'inbound=outbound' model for contributions: the act of submitting an 'inbound' contribution means that the contributor agrees to license their contribution under the same terms as the project's overall 'outbound' license - in our case, this is Apache Software License v2 (see [LICENSES/Apache-2.0.txt](./LICENSES/Apache-2.0.txt)) for code and Creative Commons Attribution-ShareAlike 4.0 International (see [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)) for other things, including text and graphics.

In order to have a concrete record that your contribution is intentional and you agree to license it under the same terms as the project's license, we've adopted the same lightweight approach used by the [Linux Kernel](https://www.kernel.org/doc/html/latest/process/submitting-patches.html), [Docker](https://github.com/docker/docker/blob/master/CONTRIBUTING.md), and many other projects: the [Developer Certificate of Origin](https://developercertificate.org/) (DCO). This is a simple declaration that you wrote the contribution or otherwise have the right to contribute it to Matrix:

<!--
SPDX-SnippetBegin
SPDX-SnippetCopyrightText: 2004, 2006 The Linux Foundation and its contributors.
SPDX-License-Identifier: LicenseRef-DCO
-->

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.
660 York Street, Suite 102,
San Francisco, CA 94110 USA

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.

Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

<!-- SPDX-SnippetEnd -->

If you agree to this for your contribution, then all that's needed is to include the line in your commit:

```
Signed-off-by: Your Name <your@email.example.org>
```

Git allows you to add this signoff automatically when using the `-s` flag to `git commit`, which uses the name and email set in your `user.name` and `user.email` git configs.

## AI Policy

<!--
SPDX-SnippetBegin
SPDX-SnippetCopyrightText: 2025 Gusted
SPDX-SnippetCopyrightText: 2025 The Matrix.org Foundation C.I.C.
SPDX-License-Identifier: CC-BY-4.0
-->

_This policy is based on [Forgejo's AI
Agreement](https://codeberg.org/forgejo/governance/src/commit/ff60d7ed4b0f3d411e6a0b5ebe5813fcad87b9dd/AIAgreement.md).
To understand more about its background, you may wish to study the discussion
leading to its creation at
<https://codeberg.org/forgejo/discussions/issues/366>._

### Terminology

This does not necessarily reflect the official or commonly used terminology.

Software and services that heavily rely on large language model technology to
generate their outcomes are referred to as Artificial Intelligence (AI).
Examples of products that fit this definition:
GitHub Copilot, ChatGPT, Claude Sonnet, DeepSeek, Llama and Gemini.

There's a distinction between general and narrow AI, all the aforementioned
examples fall under general AI as they were not trained to execute a specific
well-defined task.
Narrow AI is trained to be used for specific well-defined tasks where the
problem space is known in advance.

Vibe coding is the practice where AI creates a code change (feature, bug fix,
tests, refactor) with a human that describes what needs to be implemented.

AI agents are AIs that are configured to perform interactions or make changes
with little to no human supervision.

### Agreement

1. If content was made with the help of AI, you MUST convey that this is the
   case.
   This includes content that you authored but was motivated by a suggestion of
   AI.
2. If at any point you used AI's work in your contribution you should make an
   effort to verify that you can submit this under the license of the
   repository.
3. The accountability of using AI in a contribution lies with the person that
   makes that contribution.
4. All communication, that includes: commit messages, pull request messages,
   documentation, code comments and issues (and comments on issues/pull
   requests), that is intended to be read by people to understand your thoughts
   and work MUST NOT have been generated with AI.
   We exclude machine translation and tooling that helps with grammar and
   spelling check.
5. Using general AI for review is forbidden.
   If the change contains changes to the UX it has to be approved by a human
   reviewer.
6. It is not allowed to use AI in an autonomous-looking way to contribute to
   this repository.
   This also applies when someone engages in 'vibe coding' or uses so-called
   'agent mode'.

<!-- SPDX-SnippetEnd -->
