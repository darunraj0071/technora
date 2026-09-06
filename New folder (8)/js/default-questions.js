/**
 * TECHNORA'26 — ROUND 1: DEBUG ARENA
 * 20 Production-Grade Hard Technical MCQs
 * Specifically covers all 20 syllabus concepts from section 35:
 * 1. Python mutable default argument
 * 2. C undefined behavior
 * 3. Java String pool
 * 4. SQL NULL / COUNT
 * 5. Worst-case BST
 * 6. Python late binding
 * 7. Deadlock conditions
 * 8. C++ object lifetime
 * 9. SQL HAVING
 * 10. TCP reliability
 * 11. Java exception/finally
 * 12. Python identity/equality
 * 13. DBMS 2NF
 * 14. C pointer arithmetic
 * 15. Stack LIFO
 * 16. Java Integer caching
 * 17. Paging offset
 * 18. SQL CROSS JOIN
 * 19. Python finally return
 * 20. Recursion complexity
 */

export const DEFAULT_QUESTIONS = [
  {
    id: "q01",
    category: "Python",
    difficulty: "hard",
    active: true,
    question: "What is the exact output of the following Python program?\n\n```python\ndef append_to(element, target=[]):\n    target.append(element)\n    return target\n\nlist1 = append_to(10)\nlist2 = append_to(20, [])\nlist3 = append_to(30)\nprint(list1, list2, list3)\n```",
    options: [
      "[10] [20] [30]",
      "[10, 30] [20] [10, 30]",
      "[10] [20] [10, 30]",
      "[30] [20] [30]"
    ],
    correctAnswer: 1, // list1 and list3 share the same default list object evaluated at function definition time
    explanation: "Default parameter values in Python are evaluated once when the function definition is executed, creating a single mutable list instance. list1 and list3 bind to this shared default list, so both print [10, 30]. list2 passes an explicit new list []."
  },
  {
    id: "q02",
    category: "C",
    difficulty: "hard",
    active: true,
    question: "Consider the following C code snippet executed on an ISO C11 compliant compiler:\n\n```c\n#include <stdio.h>\nint main(void) {\n    int i = 5;\n    i = i++ + ++i;\n    printf(\"%d\\n\", i);\n    return 0;\n}\n```\nWhat is the expected outcome according to the C standard?",
    options: [
      "Prints 12",
      "Prints 13",
      "Prints 14",
      "Undefined Behavior due to multiple unsequenced modifications of i"
    ],
    correctAnswer: 3,
    explanation: "Between previous and next sequence points (or unsequenced value computations in C11 6.5#2), modifying an object more than once produces undefined behavior. Compilers are free to reorder or optimize unpredictably."
  },
  {
    id: "q03",
    category: "Java",
    difficulty: "hard",
    active: true,
    question: "What will the following Java code print?\n\n```java\nString s1 = \"technora\";\nString s2 = new String(\"technora\");\nString s3 = s2.intern();\n\nSystem.out.println((s1 == s2) + \" \" + (s1 == s3) + \" \" + (s2 == s3));\n```",
    options: [
      "true true true",
      "false true false",
      "false true true",
      "false false false"
    ],
    correctAnswer: 1,
    explanation: "s1 references the String constant pool entry. s2 references a newly allocated object on the heap, so s1 == s2 is false. s2.intern() returns the canonical pool reference identical to s1, so s1 == s3 is true, and s2 == s3 is false."
  },
  {
    id: "q04",
    category: "SQL",
    difficulty: "hard",
    active: true,
    question: "A table `submissions` contains 5 rows where column `score` has values: `10, 20, NULL, NULL, 30`.\n\nWhat is the output of the query:\n```sql\nSELECT COUNT(*), COUNT(score), COUNT(DISTINCT score) FROM submissions;\n```",
    options: [
      "5, 3, 3",
      "5, 5, 4",
      "3, 3, 3",
      "5, 3, 4"
    ],
    correctAnswer: 0,
    explanation: "COUNT(*) counts all rows regardless of NULLs (yields 5). COUNT(score) ignores NULL values (yields 3). COUNT(DISTINCT score) evaluates distinct non-NULL values (10, 20, 30 -> yields 3)."
  },
  {
    id: "q05",
    category: "DSA",
    difficulty: "hard",
    active: true,
    question: "If keys are inserted into a standard Binary Search Tree (without balancing/AVL rotations) in strictly sorted ascending order [1, 2, 3, ..., N], what are the worst-case time complexities for Search and Insertion operations?",
    options: [
      "Search: O(log N), Insertion: O(log N)",
      "Search: O(N), Insertion: O(log N)",
      "Search: O(N), Insertion: O(N)",
      "Search: O(log N), Insertion: O(N)"
    ],
    correctAnswer: 2,
    explanation: "Inserting sorted elements into an unbalance BST results in a degenerate skewed tree resembling a linked list with depth N. Both searching and inserting traverse all N nodes in the worst case, yielding O(N)."
  },
  {
    id: "q06",
    category: "Python",
    difficulty: "hard",
    active: true,
    question: "Examine the following snippet utilizing late binding in Python closures:\n\n```python\nmultipliers = [lambda x: x * i for i in range(4)]\nresults = [f(2) for f in multipliers]\nprint(results)\n```\nWhat is the printed list?",
    options: [
      "[0, 2, 4, 6]",
      "[6, 6, 6, 6]",
      "[0, 0, 0, 0]",
      "[8, 8, 8, 8]"
    ],
    correctAnswer: 1,
    explanation: "Python closures bind variables late by reference, not by value at creation. When the lambdas are called, the loop has completed and the outer scope variable `i` is 3. Therefore each lambda computes 2 * 3 = 6."
  },
  {
    id: "q07",
    category: "OS",
    difficulty: "hard",
    active: true,
    question: "Which of the following describes the FOUR Coffman conditions that must hold simultaneously for a system deadlock to occur?",
    options: [
      "Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait",
      "Mutual Exclusion, Preemption, Starvation, Race Condition",
      "Process Synchronization, Critical Section, Busy Waiting, Semaphore lock",
      "Paging, Segmentation, Thrashing, Circular Wait"
    ],
    correctAnswer: 0,
    explanation: "The four necessary and sufficient conditions formulated by Edward G. Coffman Jr. in 1971 are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait."
  },
  {
    id: "q08",
    category: "C++",
    difficulty: "hard",
    active: true,
    question: "Consider this C++ program testing object destruction order:\n\n```cpp\n#include <iostream>\nstruct Tracker {\n    char id;\n    Tracker(char c) : id(c) { std::cout << id; }\n    ~Tracker() { std::cout << id; }\n};\n\nvoid test() {\n    Tracker a('A');\n    Tracker b('B');\n    Tracker c('C');\n}\n\nint main() {\n    test();\n    return 0;\n}\n```\nWhat is the exact stdout output?",
    options: [
      "ABCABC",
      "ABCCBA",
      "CBACBA",
      "ABCCAB"
    ],
    correctAnswer: 1,
    explanation: "Automatic storage (stack) objects in C++ are constructed in order of declaration (A, then B, then C) and destructed in strictly reverse order of construction when going out of scope (C, then B, then A). The total sequence is ABCCBA."
  },
  {
    id: "q09",
    category: "SQL",
    difficulty: "hard",
    active: true,
    question: "In standard ANSI SQL, what is the fundamental functional distinction regarding where `WHERE` and `HAVING` filters operate during query execution?",
    options: [
      "`WHERE` filters aggregated groups; `HAVING` filters individual rows prior to grouping",
      "`WHERE` filters individual rows before aggregation; `HAVING` filters aggregated groups after GROUP BY",
      "`WHERE` can only be used with subqueries; `HAVING` cannot contain boolean expressions",
      "`HAVING` replaces `WHERE` whenever an INDEX is active on the table"
    ],
    correctAnswer: 1,
    explanation: "In SQL logical query processing, the WHERE clause evaluates and filters base table rows before any GROUP BY operation. The HAVING clause evaluates conditions on the grouped result sets and aggregate function calculations."
  },
  {
    id: "q10",
    category: "Networking",
    difficulty: "hard",
    active: true,
    question: "During a standard TCP 3-way handshake, if Client sends `SYN` with sequence number `seq = 1000`, what are the exact flags and `ack` sequence number in the Server's response?",
    options: [
      "Flags: `SYN, ACK`, Ack number: `1000`",
      "Flags: `SYN, ACK`, Ack number: `1001`",
      "Flags: `ACK`, Ack number: `1001`",
      "Flags: `SYN`, Ack number: `1001`"
    ],
    correctAnswer: 1,
    explanation: "The server responds with SYN and ACK flags set simultaneously (SYN-ACK). Because a SYN flag consumes one logical sequence number in TCP byte stream numbering, the acknowledgment number must be client_seq + 1 = 1001."
  },
  {
    id: "q11",
    category: "Java",
    difficulty: "hard",
    active: true,
    question: "What does the following Java method return?\n\n```java\npublic static int compute() {\n    try {\n        int x = 10 / 0;\n        return 1;\n    } catch (ArithmeticException e) {\n        return 2;\n    } finally {\n        return 3;\n    }\n}\n```",
    options: [
      "Throws ArithmeticException",
      "Returns 1",
      "Returns 2",
      "Returns 3"
    ],
    correctAnswer: 3,
    explanation: "In Java, if a `finally` block executes a `return` statement, it abruptly completes and overrides any pending return value or unhandled exception originating from the `try` or `catch` blocks. The method returns 3."
  },
  {
    id: "q12",
    category: "Python",
    difficulty: "hard",
    active: true,
    question: "Evaluate the output of this Python integer identity test:\n\n```python\na = 256\nb = 256\nx = 257\ny = 257\nprint((a is b), (x is y))\n```\n(Executed in standard CPython REPL line-by-line)",
    options: [
      "True True",
      "True False",
      "False False",
      "False True"
    ],
    correctAnswer: 1,
    explanation: "CPython maintains an internal global small integer cache for integers in the range [-5, 256]. Therefore `a is b` evaluates to True as they share the same memory address. For 257, distinct object instances are created, so `x is y` is False."
  },
  {
    id: "q13",
    category: "DBMS",
    difficulty: "hard",
    active: true,
    question: "In Relational Database Normalization, a relation R is in Second Normal Form (2NF) if and only if:",
    options: [
      "It is in 1NF and contains no transitive dependencies",
      "It is in 1NF and no non-prime attribute is partially dependent on any candidate key",
      "Every determinant is a superkey (Boyce-Codd condition)",
      "It contains no multivalued dependencies"
    ],
    correctAnswer: 1,
    explanation: "2NF requires the relation to be in 1NF and that every non-prime attribute is fully functionally dependent on the entire primary/candidate key, meaning no partial dependencies exist."
  },
  {
    id: "q14",
    category: "C",
    difficulty: "hard",
    active: true,
    question: "What is the output of the following C pointer manipulation program?\n\n```c\n#include <stdio.h>\nint main(void) {\n    int arr[] = {10, 20, 30, 40};\n    int *p = arr;\n    int val = *p++;\n    printf(\"%d %d\\n\", val, *p);\n    return 0;\n}\n```",
    options: [
      "10 20",
      "11 10",
      "20 20",
      "10 10"
    ],
    correctAnswer: 0,
    explanation: "The postfix `++` has higher precedence than unary `*`. `*p++` dereferences the original address of `p` (yielding 10 into `val`), and subsequently increments pointer `p` to point to `arr[1]` (which is 20)."
  },
  {
    id: "q15",
    category: "DSA",
    difficulty: "hard",
    active: true,
    question: "An initially empty Stack S and Queue Q are manipulated in this order:\n1. S.push(1), S.push(2), S.push(3)\n2. Q.enqueue(S.pop()), Q.enqueue(S.pop())\n3. S.push(4)\n4. Q.enqueue(S.pop())\n\nWhat is the sequence of elements returned by consecutively dequeuing all elements from Q?",
    options: [
      "1, 2, 4",
      "3, 2, 4",
      "3, 2, 1",
      "4, 2, 3"
    ],
    correctAnswer: 1,
    explanation: "S is [1, 2, 3]. S.pop() yields 3 -> Q.enqueue(3). S.pop() yields 2 -> Q.enqueue(2). S.push(4) makes S [1, 4]. S.pop() yields 4 -> Q.enqueue(4). Queue Q holds [3, 2, 4]. Dequeuing gives 3, 2, 4."
  },
  {
    id: "q16",
    category: "Java",
    difficulty: "hard",
    active: true,
    question: "What is the exact boolean output of this Java comparison?\n\n```java\nInteger x = 127;\nInteger y = 127;\nInteger m = 128;\nInteger n = 128;\nSystem.out.println((x == y) + \" \" + (m == n));\n```",
    options: [
      "true true",
      "false false",
      "true false",
      "false true"
    ],
    correctAnswer: 2,
    explanation: "According to JLS §5.1.7, autoboxing caches Integer objects in the range -128 to 127 (via IntegerCache). For 127, x and y refer to the identical cached instance (true). For 128, distinct heap objects are created, so m == n evaluates to false."
  },
  {
    id: "q17",
    category: "OS",
    difficulty: "hard",
    active: true,
    question: "In a 32-bit paging system with a 4 KB (4096 bytes) page size, what are the Page Number and Offset for virtual byte address `0x00003A4F`?",
    options: [
      "Page Number: 3, Offset: 0xA4F (2639 bytes)",
      "Page Number: 14, Offset: 0x04F",
      "Page Number: 0x3A, Offset: 0x4F",
      "Page Number: 4, Offset: 0x24F"
    ],
    correctAnswer: 0,
    explanation: "4 KB page size requires 12 bits for offset (2^12 = 4096). The lowest 12 bits (3 hex digits) of 0x00003A4F are `0xA4F` (the offset). The remaining higher bits are `0x3` = 3 (the page number)."
  },
  {
    id: "q18",
    category: "SQL",
    difficulty: "hard",
    active: true,
    question: "Table `Engineers` has 12 rows and Table `Projects` has 5 rows. A developer runs:\n```sql\nSELECT COUNT(*) FROM Engineers CROSS JOIN Projects;\n```\nAssuming neither table contains triggers or errors, how many rows will be returned?",
    options: [
      "17",
      "60",
      "12",
      "0"
    ],
    correctAnswer: 1,
    explanation: "A CROSS JOIN produces the Cartesian product of the two tables. The resulting cardinality is the product of the input cardinalities: 12 * 5 = 60 rows."
  },
  {
    id: "q19",
    category: "Python",
    difficulty: "hard",
    active: true,
    question: "What is the return value of invoking `execute_flow()` in Python?\n\n```python\ndef execute_flow():\n    try:\n        try:\n            return \"A\"\n        finally:\n            return \"B\"\n    finally:\n        return \"C\"\n\nprint(execute_flow())\n```",
    options: [
      "A",
      "B",
      "C",
      "SyntaxError: multiple return statements in finally"
    ],
    correctAnswer: 2,
    explanation: "In nested try-finally constructs in Python, when an inner finally block executes a return, it suppresses the try return. Then the outer finally block executes its return 'C', which supersedes everything before it. Output is 'C'."
  },
  {
    id: "q20",
    category: "Algorithms",
    difficulty: "hard",
    active: true,
    question: "What is the asymptotic tight time complexity of the recurrence relation $T(n) = 2T(n/2) + \\Theta(n)$ as solved by the Master Theorem?",
    options: [
      "Θ(n)",
      "Θ(n log n)",
      "Θ(n^2)",
      "Θ(log n)"
    ],
    correctAnswer: 1,
    explanation: "For T(n) = aT(n/b) + f(n), here a = 2, b = 2, so n^(log_b(a)) = n^(log_2(2)) = n^1. Since f(n) = Θ(n) = Θ(n^(log_b(a))), Case 2 of the Master Theorem applies, yielding Θ(n log n) (canonical Mergesort recurrence)."
  }
];
