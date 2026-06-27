import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * withNavigate — Higher Order Component (HOC)
 *
 * PROBLEM:
 *   React Router v6 provides navigation through a "hook" called useNavigate().
 *   Hooks can ONLY be used inside functional components.
 *   Our Login and Signup components are CLASS-based, so they cannot use hooks directly.
 *
 * SOLUTION — This HOC acts as a bridge:
 *   1. It creates a thin functional wrapper around the class component.
 *   2. The functional wrapper calls useNavigate() (hooks are allowed here).
 *   3. It passes the navigate function as a prop to the class component.
 *   4. Inside the class component, navigation is done with:
 *        this.props.navigate('/dashboard');
 *
 * HOW TO USE:
 *   At the very bottom of your class component file, wrap and export it:
 *
 *     export default withNavigate(YourClassName);
 *
 *   Then in any method inside the class:
 *
 *     this.props.navigate('/some-path');
 *
 * @param {class} WrappedComponent - The class component to wrap
 * @returns {function} - A new functional component that injects the navigate prop
 */
function withNavigate(WrappedComponent) {
  // This inner function is a functional component — it CAN use hooks
  function ComponentWithNavigate(props) {
    // useNavigate() returns a function we can call to change the URL
    const navigate = useNavigate();

    // Render the original class component and pass navigate as a prop
    // {...props} spreads all existing props through so nothing is lost
    return <WrappedComponent {...props} navigate={navigate} />;
  }

  return ComponentWithNavigate;
}

export default withNavigate;
