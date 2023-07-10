
import * as dotenv from 'dotenv'
dotenv.config()
console.log("Starting server...")
//@ts-ignore
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

import { createServer } from './health-check'
import { run } from './pulling'

run({ localMode: false, isConciseMode: false })
createServer()
