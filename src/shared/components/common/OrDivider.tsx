/** Visual "or" separator used between the primary submit button and OAuth buttons. */
export function OrDivider() {
  return (
    <div className="relative my-1" aria-hidden="true">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-background px-3 text-muted-foreground font-medium">or</span>
      </div>
    </div>
  )
}
