import { createClient } from "@supabase/supabase-js";
export function platformServer(request: Request) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global:{headers:{Authorization:request.headers.get("authorization")??"","x-kairo-audit":process.env.ACTIVITY_SERVER_SECRET??""}},
    auth:{persistSession:false,autoRefreshToken:false},
  });
  return async function rpc<T>(operation:string,payload:object):Promise<T> {
    const {data,error}=await db.rpc("platform_api",{operation,payload});
    if(error)throw new Error(error.message);
    return data as T;
  };
}
