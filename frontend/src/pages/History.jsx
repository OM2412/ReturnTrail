import Link from "../components/CaseLink";
import {
  ArrowUpRight,
  History as HistoryIcon,
  FilePlus2,
  MessageSquare,
  SquareCheck,
} from "lucide-react";
import { useCase } from "../app/CaseContext";
import { CopyReference, Empty, PageTitle, SourceNote } from "../components/UI";
import { timestamp, workflowEvents } from "../lib/domain";
export default function History() {
  const { data } = useCase();
  const events = workflowEvents(
    data.actions,
    data.clarifications,
    data.evidence,
  );
  return (
    <>
      <PageTitle
        label="THE STORY SO FAR"
        title="Receipts? Kept."
        description="A little timeline of the sources, questions and manual replies saved in this demo case."
      />
      <div className="history-intro">
        <span className="chunky-icon">
          <HistoryIcon size={26} />
        </span>
        <div>
          <strong>The original story stays. New context joins it.</strong>
          <p>
            Saving a reply adds to the trail. It does not rewrite the source
            records.
          </p>
        </div>
        <span className="sticker">NOTED. ✓</span>
      </div>
      {!events.length ? (
        <Empty
          icon={HistoryIcon}
          title="Your workflow history starts with a saved task."
        >
          <p>
            Read the records and run an investigation. Any saved question or
            reply will appear here.
          </p>
          <Link className="button primary" to="/case/investigation">
            Open investigation <ArrowUpRight size={17} />
          </Link>
        </Empty>
      ) : (
        <ol className="history-timeline">
          {events.map((event, index) => (
            <li key={event.id}>
              <div className="history-time">
                <span>{timestamp(event.at)}</span>
                <code>CHAPTER {String(index + 1).padStart(2, "0")}</code>
              </div>
              <span className={`history-marker ${event.kind}`}>
                {event.kind === "task" ? (
                  <SquareCheck size={21} />
                ) : event.kind === "evidence" ? (
                  <FilePlus2 size={21} />
                ) : (
                  <MessageSquare size={21} />
                )}
              </span>
              <article
                className={event.kind === "task" ? "tone-peach" : "tone-mint"}
              >
                <span className="sticker">
                  {event.kind === "task"
                    ? "A QUESTION WAS SAVED"
                    : event.kind === "evidence"
                      ? "A SOURCE JOINED THE TRAIL"
                      : "A MANUAL REPLY WAS ADDED"}
                </span>
                <h2>
                  {event.kind === "task"
                    ? "One thing needed clearing up."
                    : event.kind === "evidence"
                      ? "New words. A little more context."
                      : "A reply joined the paper trail."}
                </h2>
                <p>{event.body}</p>
                {event.kind === "evidence" && (
                  <SourceNote>
                    A manually added synthetic source, saved at evidence version{" "}
                    {event.revision}. Its claim is not independently verified.
                  </SourceNote>
                )}
                {event.kind === "clarification" && (
                  <SourceNote>
                    This is a manual reply, not independently verified. The task
                    status when recorded was {event.status}.
                  </SourceNote>
                )}
                <div className="history-card-footer">
                  <Link className="text-link" to={event.to}>
                    {event.kind === "evidence"
                      ? "Read the source"
                      : "View the follow-up"}{" "}
                    <ArrowUpRight size={16} />
                  </Link>
                  <CopyReference
                    value={event.reference}
                    label={
                      event.kind === "evidence"
                        ? "Source reference"
                        : "Linked task reference"
                    }
                  />
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
      <SourceNote>
        This timeline shows added sources, saved tasks and replies. It is not a
        complete log of every click, record read, or model request.
      </SourceNote>
    </>
  );
}
