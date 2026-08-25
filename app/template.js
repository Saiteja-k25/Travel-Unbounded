// A template re-mounts on every navigation (a layout does not), which makes it
// the right place for an enter animation. Each new page fades up over the
// cream background, giving the cross-fade feel between routes.
export default function Template({ children }) {
  return <div className="page-enter flex flex-1 flex-col">{children}</div>;
}
