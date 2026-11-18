/**
 * Master CS — Course Registry
 *
 * Add, remove, or edit courses here.
 * Both the Home Hub (index.html) and the shared navigation sidebar
 * read directly from window.MASTER_CS_COURSES.
 */
(function () {
  window.MASTER_CS_COURSES = [
    {
      id: "algorithms",
      code: "CS-501",
      title: "Algorithms & Graph Theory",
      category: "Theory",
      color: "#2563eb",
      page: "courses/algorithms.html",
      archived: true,
      description:
        "Graph search heuristics, shortest-path algorithms, and balanced tree traversals with step-by-step execution.",
      topics: ["BFS / DFS", "Dijkstra & A*", "Binary Search Trees"],
      vizCount: 2
    },
    {
      id: "machine-learning",
      code: "CS-520",
      title: "Machine Learning",
      category: "AI & ML",
      color: "#7c3aed",
      page: "courses/machine-learning.html",
      archived: true,
      description:
        "Optimization dynamics, learning-rate stability, L2 regularization, and unsupervised clustering on 2D manifolds.",
      topics: ["Gradient Descent", "Polynomial Regression", "K-Means Clustering"],
      vizCount: 2
    },
    {
      id: "mdl",
      code: "DSAIT 4005",
      title: "Machine and Deep Learning",
      category: "AI & ML",
      color: "#0284c7",
      page: "courses/mdl.html",
      archived: false,
      description:
        "Week 1a Introduction: Feature spaces, Bayes' rule, class posteriors, Bayes error ε*, and minimum-risk classification with costs.",
      topics: ["Week 1a: Bayes' Rule", "Bayes Error ε*", "Misclassification Costs"],
      vizCount: 3
    },
    {
      id: "distributed-systems",
      code: "CS-540",
      title: "Distributed Systems",
      category: "Systems",
      color: "#0d9488",
      page: "courses/distributed-systems.html",
      archived: true,
      description:
        "Logical time, causality in asynchronous networks, and consistent hashing with virtual nodes.",
      topics: ["Lamport Clocks", "Vector Clocks", "Consistent Hashing"],
      vizCount: 2
    },
    {
      id: "systems-architecture",
      code: "CS-510",
      title: "Computer Architecture & Memory",
      category: "Systems",
      color: "#d97706",
      page: "courses/systems-architecture.html",
      archived: true,
      description:
        "Cache associativity, address bit slicing, replacement policies, and IEEE 754 floating-point encoding.",
      topics: ["CPU Cache Simulator", "LRU / FIFO", "IEEE 754 Floats"],
      vizCount: 2
    }
  ];
})();
