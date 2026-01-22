import React, { ReactNode, FunctionComponent, MouseEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import "./SortableComponent.css";

export interface SortableItemProps {
  id: string;
  isActive?: boolean;
  children?: ReactNode;
  isOverlay?: boolean;
  onClick?: () => void;
}

/**
 * Handle-only drag:
 * - Drag starts only from the handle (⋮⋮)
 * - Clicking the card body triggers onClick reliably
 */
export const SortableItem: FunctionComponent<SortableItemProps> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
  });

  // dnd-kit overlay items should not be interactive
  const overlay = !!props.isOverlay;

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    cursor: overlay ? "grabbing" : "default",
  };

  const className = `btn shadow-none sortable-item ${
    props.isActive ? "active" : ""
  } ${isDragging ? "dragging" : ""}`;

  const handleClick = () => {
    if (overlay) return;
    // Optional: ignore click if user is actively dragging
    if (isDragging) return;
    props.onClick?.();
  };

  // Prevent handle clicks from triggering the card click
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <li className={className} ref={setNodeRef} style={style} onClick={handleClick}>
      {/* Drag handle */}
      {!overlay && (
        <span
          className="drag-handle"
          onClick={stop}
          // Put dnd-kit drag listeners ONLY on the handle:
          {...attributes}
          {...listeners}
          aria-label="Drag"
          title="Drag"
        >
          ⋮⋮
        </span>
      )}

      {/* Card content (clickable) */}
      <div className="item-content">{props.children ?? null}</div>
    </li>
  );
};

