import { Link } from "react-router";
import { useCase } from "../app/CaseContext";
export default function CaseLink({ to, ...props }) {
  const { data } = useCase();
  const scoped =
    typeof to === "string" &&
    /^\/case(?:\/|\?|$)/.test(to) &&
    !/^\/case\/CASE-/.test(to)
      ? to.replace(/^\/case/, `/case/${data?.caseId || "CASE-001"}`)
      : to;
  return <Link to={scoped} {...props} />;
}
