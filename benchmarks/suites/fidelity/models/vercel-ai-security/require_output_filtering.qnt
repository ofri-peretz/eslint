// Model of eslint-plugin-vercel-ai-security/require-output-filtering (CWE-200).
// A tool execute (arrow, block, or method form) that returns a data-source
// member call (a call chain with a data-access word: query, find, select, db,
// prisma, supabase…), directly or via a local initialised from one, unwrapped
// by a filter (filterSensitive, removePII, sanitize…) is reported. Plain calls
// such as getWeather(city) or fetchData(url) are not data sources.
module require_output_filtering {
  type ExecForm = ArrowExpr | BlockReturn | BlockVar | MethodForm
  type Ret =
    | DbQuery         // db.query(sql)
    | PrismaFind      // prisma.user.findUnique({ where: { id } })
    | SupabaseSelect  // supabase.from('users').select('*')
    | UsersFindById   // users.findById(id)
    | GetWeather      // getWeather(id)
    | FetchData       // fetchData(id)
    | Filtered        // filterSensitive(db.query(sql))
    | RemovePII       // removePII(prisma.user.findUnique(…))
  type Container = ToolsMap | ToolHelper

  pure def rawSource(r: Ret): bool =
    r == DbQuery or r == PrismaFind or r == SupabaseSelect or r == UsersFindById

  pure def reports(importsAi: bool, f: ExecForm, r: Ret, c: Container): bool =
    importsAi and rawSource(r)

  var importsAi: bool
  var execForm: ExecForm
  var ret: Ret
  var container: Container
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet f = Set(ArrowExpr, BlockReturn, BlockVar, MethodForm).oneOf()
    nondet r = Set(DbQuery, PrismaFind, SupabaseSelect, UsersFindById, GetWeather, FetchData, Filtered, RemovePII).oneOf()
    nondet c = Set(ToolsMap, ToolHelper).oneOf()
    all { importsAi' = i, execForm' = f, ret' = r, container' = c, verdict' = reports(i, f, r, c) }
  }

  action init = step
}
