import os
from typing import Any, Dict, Optional, TypeVar, Union

import streamlit.components.v1 as components
import streamlit as st

T = TypeVar("T", str, Dict[str, Any])

_RELEASE = True

# build-marker: force new SHA

if not _RELEASE:
    _component_func = components.declare_component(
        "sortable_items",
        url="http://localhost:3001",
    )
else:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("sortable_items", path=build_dir)


def sort_items(
    items: list[T],
    header: Optional[str] = None,
    multi_containers: bool = False,
    direction: str = "horizontal",
    custom_style: Optional[str] = None,
    item_labels: Optional[Dict[str, str]] = None,
    key: Any = None,
    return_events: bool = False,
    returnEvents: Optional[bool] = None,
) -> Union[list[T], Dict[str, Any]]:
    """
    Create a new instance of the sortable component.

    If return_events=True, returns:
      {
        "containers": <container list>,
        "event": <event dict or None>
      }

    Otherwise returns:
      - list[str] (single container mode)
      - list[dict] (multi container mode)
    """

    # Normalize into container format expected by the frontend
    if not multi_containers:
        if header is not None and not isinstance(header, str):
            raise ValueError("header must be str or None when multi_containers=False")
        if not all(isinstance(item, str) for item in items):
            raise ValueError("items must be list[str] when multi_containers=False")
        containers_in = [{"header": header or "", "items": items}]
    else:
        if not all(isinstance(item, dict) for item in items):
            raise ValueError("items must be list[dict[str, Any]] when multi_containers=True")
        containers_in = items  # type: ignore[assignment]

    if returnEvents is not None:
        return_events = bool(returnEvents)

    component_value = _component_func(
        items=containers_in,
        direction=direction,
        customStyle=custom_style,
        itemLabels=item_labels,
        returnEvents=return_events,
        default=containers_in,
        key=key,
    )

    state_key = f"sortable_items_state_{key}" if key is not None else "sortable_items_state_default"

    # --- return_events mode ---
    if return_events:
        event = None
        containers_out = containers_in

        # Frontend click events are dicts
        if isinstance(component_value, dict) and component_value.get("event") == "click":
            event = {
                "event": "click",
                "header": component_value.get("header"),
                "item": component_value.get("item"),
            }
            # Prefer containers provided by frontend; fallback to last known state
            containers_out = component_value.get("containers") or st.session_state.get(state_key, containers_in)
        else:
            # Drag / reorder returns containers list
            if isinstance(component_value, list):
                containers_out = component_value
            else:
                containers_out = st.session_state.get(state_key, containers_in)

        # Persist last known containers so click can reference them
        st.session_state[state_key] = containers_out

        return {"containers": containers_out, "event": event}

    # --- legacy mode (no events) ---
    if isinstance(component_value, dict) and component_value.get("event") == "click":
        # If caller didn't request events, ignore click and return last known containers
        containers_out = st.session_state.get(state_key, containers_in)
    else:
        containers_out = component_value
        st.session_state[state_key] = containers_out

    if multi_containers:
        return containers_out
    return containers_out[0]["items"]


# Dev-only test harness
if not _RELEASE:
    st.title("Sortables (dev)")

    st.write("Sort items in a single container.")
    items1 = ["item1", "item2", "item3"]
    st.write(sort_items(items1))

    st.write("---")
    st.write("Sort items in multiple containers.")
    items2 = [
        {"header": "container1", "items": ["item1", "item2", "item3"]},
        {"header": "container2", "items": ["item4", "item5", "item6"]},
    ]
    st.write(sort_items(items2, multi_containers=True))
