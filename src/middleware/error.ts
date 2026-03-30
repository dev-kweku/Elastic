import { Context,Next } from "koa";


export async function errorHandler(ctx:Context,next:Next){
    try{
        return next()

    }catch(err:unknown){
        const error=err as Error & {status?:number;statusCode?:number}
        const status=error.status||error.statusCode||500
        console.error(`[ERROR] ${ctx.method} ${ctx.path}`,{
            status,message:error.message,stack:process.env.NODE_ENV !=='production'?error.stack:undefined,
        })
        ctx.status=status
        ctx.body={
            error:status===500?'Internal server error':error.message,
            details:process.env.NODE_ENV!=='production'?error.message:undefined,
            status,
        }

    }
}