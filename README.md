Hello i want you to create a Terminal user interface like Claude Code and GHGrab. where once run in terminal you can navigate thru things, type, clicks and everything. I have a template repo that will serve as the service point for creating a new repository This is what i want to achieve theres a 4 core branches.

* main : view point, other developers and client will see this branch release/* : this branch will show the release version of the codebase meaning no temp files, and everything.

* production : this branch is the war field in the repository but theres a rule that merging the branch here will require to do a pull request. production branch allows any developers to do a merge even their own pull request. 

* safe-production : this branch is a safe version of the production branch if the production branch has no issue a CI/CD will create a copy of the production branch and will put on safe-production 

* production/<type>/<scope>/<name> : this branch is developers standard branch when coding. type: feat, refactor, fix, docs, style, chore. this branch is a temporary development branch, this branch is used to merge within the production branch once a successfull merge was commited this branch will be deleted.

i want you to create a Claude Code like interface which add interactive CLI. use this pallete: 091413, 285A48, 408A71, B0E4CC.
also in our CLI tool we will add syntax intellisense.


so i will explain the Features then.

* Safe Prodiction Checker: create a new thread that constantly check cthe repository status. this listener checks the safe-production branch for changes then notified the user that the branch was changed and he will need to pull the latest changes.

* Branch Creation and Conventional Commits: on git there are two types of repository right? local repo and remote repo, local repo is the once your using in your machine while the remote repo is the one hosted in the github. once creating a new branch it will ask for the type and scope. every "push" on that branch will automatically set the type and scope to the commits.

* Branch registration: you can register the branch your working on to the remote repo so everyone can access your branch, and also if your ready to make a pull request.

* Execution of normal git commands. while this wrapper seems to looks fine we are allowing our clients to use normal git commands to enchane the power of this wrapper.

* status printing: developers can check their current branch status if it is behind and also if it will cause issue if merging in production branch.
also creating a branch must restrain the client to create a branch from "safe-production" creating a branch for other main branches will prompt them for the approval.

NOTE: and also devs can create branch to the production/* branches. ex:
production/docs/repo/initialize-repository > production/docs/repo/copyof/initialize-repository
i like Terminal user Interface like Claude Code, and GHGrab. and also give the the setup guide so i can see how i can set up your given codes.
you can add your own feature if you want to add something. 



but before we code. we need to split the task not coding it in one go. you can make layers first like make the TUI first before creating the functions. here is the current packages that i used:

```cmd
root/
  /src/cli/inded.tsx
  /src/tui/App.tsx
  .gitignore
  package-lock.json
  package.json
  tsconfig.json
```

```cmd
//Type Script Config:
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "jsx": "react-jsx",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "types": ["node"]
  },
  "include": ["src"]
}

//package.json
{
  "name": "zephyr",
  "version": "1.0.0",
  "description": "TEMP",
  "main": "index.js",
  "scripts": {
    "dev": "tsx src/cli/index.ts",
    "build": "tsc",
    "start": "node dist/cli/index.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Terminal71-Corporation/Zephyr.git"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "bugs": {
    "url": "https://github.com/Terminal71-Corporation/Zephyr/issues"
  },
  "homepage": "https://github.com/Terminal71-Corporation/Zephyr#readme",
  "dependencies": {
    "@clack/prompts": "^1.4.0",
    "@inkjs/ui": "^2.0.0",
    "chalk": "^5.6.2",
    "cli-highlight": "^2.1.11",
    "cli-table3": "^0.6.5",
    "commander": "^14.0.3",
    "execa": "^9.6.1",
    "ink": "^7.0.4",
    "ink-select-input": "^6.2.0",
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "log-update": "^8.0.0",
    "ora": "^9.4.0",
    "react": "^19.2.6",
    "simple-git": "^3.36.0",
    "zustand": "^5.0.13"
  },
  "devDependencies": {
    "@types/node": "^25.9.1",
    "@types/react": "^19.2.15",
    "tsx": "^4.22.3",
    "typescript": "^6.0.3"
  }
}

```

NOTE: do not code first lets split up the task before we do the code and actions. i already set up the project. you can ask me some question so we can plan our project much better.