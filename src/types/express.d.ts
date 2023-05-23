import Express from 'express';
import * as US from '../schemas/user.schema';
import * as CONT from '../schemas/content.schema';

declare global {
    namespace Express {
        interface User extends US.User {}
        interface Content extends CONT.Content {}
    }
}