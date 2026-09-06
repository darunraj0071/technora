/**
 * TECHNORA'26 — ROUND 2: CODE BREAKER
 * Problem Bank Specification (4 Hard Technical Assessment Problems)
 * 
 * Each problem includes:
 * - Specification, Constraints, I/O formats, Examples
 * - Starter code in Python, C, C++, Java (~30 lines each with believable subtle bugs)
 * - Public test cases (3-5)
 * - Hidden test cases (20-26) testing performance, boundaries, and counter-cases
 * - Time & memory limits
 */

export const ROUND2_PROBLEMS = [
  // =========================================================================
  // PROBLEM 1: THE SLIDING WINDOW TRAP
  // =========================================================================
  {
    id: "p1",
    number: 1,
    title: "The Sliding Window Trap",
    category: "Arrays • Sliding Window • Hash Map",
    difficulty: "HARD",
    points: 100,
    timeLimit: 2, // seconds
    memoryLimit: "128 MB",
    description: `You are given an array of integers \`arr\` of size \`N\` and an integer \`K\`.

A contiguous subarray is considered **Balanced** if it contains **at most K distinct values** and the sum of elements in the subarray is strictly positive (> 0).

Your task is to find the **maximum length** of a Balanced contiguous subarray. If no such subarray exists, return \`0\`.

### Input Format
- First line contains two integers \`N\` and \`K\` separated by a space.
- Second line contains \`N\` space-separated integers representing \`arr\`.

### Output Format
- Print a single integer representing the maximum length of a valid subarray.

### Constraints
- \`1 <= N <= 2 * 10^5\`
- \`0 <= K <= N\`
- \`-10^5 <= arr[i] <= 10^5\`
- Optimal Time Complexity: \`O(N)\`
- Optimal Space Complexity: \`O(K)\``,
    examples: [
      {
        input: "6 2\n2 -1 2 3 -2 3",
        output: "4",
        explanation: "Subarray [2, -1, 2, 3] has 3 distinct values {2, -1, 3} which exceeds K=2. However [2, 3, -2, 3] has 3 distinct values. Subarray [-1, 2, 3] has 3 distinct. The valid subarray [2, -1, 2] has 2 distinct values {2, -1} and sum 3 > 0 (len 3). Subarray [3, -2, 3] has distinct values {3, -2} and sum 4 > 0 (len 3). But subarray [2, -1, 2, 2] if present would be 4. Here max length is 3."
      },
      {
        input: "5 1\n-5 -2 -1 -4 -3",
        output: "0",
        explanation: "All subarrays have negative sums. No positive sum exists, so return 0."
      },
      {
        input: "7 3\n1 2 1 3 4 3 3",
        output: "5",
        explanation: "Subarray [1, 3, 4, 3, 3] has distinct {1, 3, 4} (3 values) and positive sum 14 > 0. Length is 5."
      }
    ],
    starters: {
      python: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    N = int(input_data[0])
    K = int(input_data[1])
    arr = [int(x) for x in input_data[2:2+N]]

    # STARTER CODE BUG:
    # 1. Frequency map does not delete keys when count hits 0, causing len(freq) to stay inflated.
    # 2. Window contraction shrinks right pointer instead of left pointer under negative sums.
    # 3. K = 0 edge case is not handled.
    freq = {}
    left = 0
    curr_sum = 0
    max_len = 0

    for right in range(N):
        val = arr[right]
        freq[val] = freq.get(val, 0) + 1
        curr_sum += val

        while len(freq) > K and left <= right:
            left_val = arr[left]
            freq[left_val] -= 1
            curr_sum -= left_val
            left += 1  # BUG: freq[left_val] remains in dict even when 0!

        if curr_sum > 0:
            max_len = max(max_len, right - left + 1)

    print(max_len)

if __name__ == "__main__":
    solve()
`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N, K;
    if (!(cin >> N >> K)) return 0;

    vector<long long> arr(N);
    for (int i = 0; i < N; i++) cin >> arr[i];

    // STARTER CODE BUG:
    // 1. freq[arr[left]] is decremented but not erased when it reaches 0.
    // 2. K=0 edge case causes infinite loops or incorrect length calculations.
    unordered_map<long long, int> freq;
    int left = 0;
    long long curr_sum = 0;
    int max_len = 0;

    for (int right = 0; right < N; right++) {
        freq[arr[right]]++;
        curr_sum += arr[right];

        while ((int)freq.size() > K && left <= right) {
            freq[arr[left]]--;
            curr_sum -= arr[left];
            left++; // BUG: forgot freq.erase(arr[left-1]) if freq reaches 0
        }

        if (curr_sum > 0 && (int)freq.size() <= K) {
            max_len = max(max_len, right - left + 1);
        }
    }

    cout << max_len << "\\n";
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int N, K;
    if (scanf("%d %d", &N, &K) != 2) return 0;

    long long *arr = (long long *)malloc(sizeof(long long) * N);
    for (int i = 0; i < N; i++) {
        scanf("%lld", &arr[i]);
    }

    // STARTER CODE BUG:
    // Naive O(N^2) attempt with uninitialized variables and memory leak
    int max_len = 0;
    for (int i = 0; i < N; i++) {
        long long sum = 0;
        int distinct = 0;
        // Brute force will TLE on N=200000; requires sliding window hash map
        for (int j = i; j < N; j++) {
            sum += arr[j];
            // Incomplete distinct counting logic...
        }
    }

    printf("%d\\n", max_len);
    free(arr);
    return 0;
}
`,
      java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null || line.trim().isEmpty()) return;

        StringTokenizer st = new StringTokenizer(line);
        int N = Integer.parseInt(st.nextToken());
        int K = Integer.parseInt(st.nextToken());

        long[] arr = new long[N];
        int idx = 0;
        while (idx < N) {
            if (!st.hasMoreTokens()) {
                String l = br.readLine();
                if (l == null) break;
                st = new StringTokenizer(l);
            }
            arr[idx++] = Long.parseLong(st.nextToken());
        }

        // STARTER CODE BUG:
        // map.remove() is missing when count hits zero!
        Map<Long, Integer> freq = new HashMap<>();
        int left = 0;
        long currSum = 0;
        int maxLen = 0;

        for (int right = 0; right < N; right++) {
            freq.put(arr[right], freq.getOrDefault(arr[right], 0) + 1);
            currSum += arr[right];

            while (freq.size() > K && left <= right) {
                freq.put(arr[left], freq.get(arr[left]) - 1);
                currSum -= arr[left];
                left++; // BUG: freq.get(arr[left-1]) == 0 must be removed from map!
            }

            if (currSum > 0 && freq.size() <= K) {
                maxLen = Math.max(maxLen, right - left + 1);
            }
        }

        System.out.println(maxLen);
    }
}
`
    },
    publicTests: [
      { id: "pub_1_1", input: "5 2\n1 2 1 2 1", expectedOutput: "5", explanation: "All 5 elements have only 2 distinct values {1, 2}, sum is 7 > 0." },
      { id: "pub_1_2", input: "4 1\n-1 -2 -3 -4", expectedOutput: "0", explanation: "No positive sum exists." },
      { id: "pub_1_3", input: "6 2\n5 -2 5 -2 5 1", expectedOutput: "5", explanation: "Subarray [5, -2, 5, -2, 5] has length 5 with 2 distinct and positive sum." },
      { id: "pub_1_4", input: "5 0\n1 2 3 4 5", expectedOutput: "0", explanation: "K=0 allows at most 0 distinct values, so no non-empty subarray is valid." }
    ],
    hiddenTests: [
      { id: "hid_1_1", input: "1 1\n10", expectedOutput: "1" },
      { id: "hid_1_2", input: "1 1\n-10", expectedOutput: "0" },
      { id: "hid_1_3", input: "1 0\n10", expectedOutput: "0" },
      { id: "hid_1_4", input: "6 3\n1 2 3 4 5 6", expectedOutput: "3" },
      { id: "hid_1_5", input: "8 2\n10 -20 10 10 -5 10 10 -30", expectedOutput: "5" },
      { id: "hid_1_6", input: "10 1\n5 5 5 5 5 5 5 5 5 5", expectedOutput: "10" },
      { id: "hid_1_7", input: "10 1\n-2 -2 -2 -2 -2 -2 -2 -2 -2 -2", expectedOutput: "0" },
      { id: "hid_1_8", input: "7 2\n1 2 3 2 1 2 3", expectedOutput: "3" },
      { id: "hid_1_9", input: "8 4\n-1 2 -3 4 -5 6 -7 8", expectedOutput: "4" },
      { id: "hid_1_10", input: "5 3\n100 -50 100 -50 100", expectedOutput: "5" },
      { id: "hid_1_11", input: "12 2\n1 1 2 2 1 1 3 3 1 1 2 2", expectedOutput: "6" },
      { id: "hid_1_12", input: "6 2\n0 0 0 0 0 0", expectedOutput: "0" },
      { id: "hid_1_13", input: "7 2\n0 1 0 1 0 1 0", expectedOutput: "7" },
      { id: "hid_1_14", input: "9 3\n1 2 3 1 2 3 1 2 3", expectedOutput: "9" },
      { id: "hid_1_15", input: "10 2\n1 2 3 4 5 6 7 8 9 10", expectedOutput: "2" },
      { id: "hid_1_16", input: "4 2\n-100 50 50 -100", expectedOutput: "2" },
      { id: "hid_1_17", input: "8 3\n1 2 -1 2 3 2 -1 2", expectedOutput: "8" },
      { id: "hid_1_18", input: "6 1\n7 7 -10 7 7 7", expectedOutput: "3" },
      { id: "hid_1_19", input: "5 5\n-1 1 -1 1 -1", expectedOutput: "4" },
      { id: "hid_1_20", input: "11 3\n1 2 3 2 1 4 1 2 3 2 1", expectedOutput: "5" }
    ]
  },

  // =========================================================================
  // PROBLEM 2: THE BROKEN STRING
  // =========================================================================
  {
    id: "p2",
    number: 2,
    title: "The Broken String",
    category: "Strings • Hashing • Two Pointers",
    difficulty: "VERY HARD",
    points: 100,
    timeLimit: 2,
    memoryLimit: "128 MB",
    description: `A string \`S\` has been corrupted through noise. We say a substring is **Harmonic** if:
1. Every character appearing in the substring appears **at least K times** within that substring.
2. The substring is **case-sensitive** (e.g., 'a' and 'A' are distinct characters).

Find the length of the **longest Harmonic substring** in \`S\`. If no such substring exists, return \`0\`.

### Input Format
- First line contains the integer \`K\`.
- Second line contains the corrupted string \`S\`.

### Output Format
- Print a single integer: length of the longest harmonic substring.

### Constraints
- \`1 <= |S| <= 10^5\`
- \`1 <= K <= |S|\`
- String \`S\` contains uppercase and lowercase English letters and digits \`[a-zA-Z0-9]\`.
- Optimal Time Complexity: \`O(26 * N)\` or \`O(N log N)\`
- Brute Force \`O(N^2)\` will exceed runtime limits on hidden tests!`,
    examples: [
      {
        input: "2\naaabbb",
        output: "6",
        explanation: "'a' appears 3 times (>=2) and 'b' appears 3 times (>=2). Entire string is valid."
      },
      {
        input: "3\nababbc",
        output: "0",
        explanation: "No substring has all its characters appearing at least 3 times."
      },
      {
        input: "2\naaBccBBaa",
        output: "9",
        explanation: "'a' appears 4 times, 'B' appears 3 times, 'c' appears 2 times. Length is 9."
      }
    ],
    starters: {
      python: `import sys

def longest_harmonic(s, k):
    # STARTER CODE BUG:
    # 1. Fails when divide and conquer split character appears at the boundary.
    # 2. Infinite recursion when every character in substring has count < k.
    # 3. Case-sensitivity mapping issue in character counting.
    if len(s) < k:
        return 0
    
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    
    for ch, count in counts.items():
        if count < k:
            # Split by character that cannot be in valid substring
            # BUG: splits only on the first occurrence instead of all segments
            parts = s.split(ch)
            return max(longest_harmonic(part, k) for part in parts)
            
    return len(s)

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    k = int(lines[0])
    s = lines[1] if len(lines) > 1 else ""
    print(longest_harmonic(s, k))

if __name__ == "__main__":
    main()
`,
      cpp: `#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>

using namespace std;

int solveHarmonic(const string& s, int k) {
    if ((int)s.length() < k) return 0;

    unordered_map<char, int> freq;
    for (char c : s) freq[c]++;

    // STARTER BUG:
    // When multiple invalid characters exist, splitting without recursive bounds causes TLE/StackOverflow
    for (int i = 0; i < (int)s.length(); i++) {
        if (freq[s[i]] < k) {
            int leftRes = solveHarmonic(s.substr(0, i), k);
            int rightRes = solveHarmonic(s.substr(i + 1), k);
            return max(leftRes, rightRes); // BUG: Misses other split chunks if multiple same chars
        }
    }

    return s.length();
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int k;
    string s;
    if (cin >> k >> s) {
        cout << solveHarmonic(s, k) << "\\n";
    }
    return 0;
}
`,
      c: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main() {
    int k;
    if (scanf("%d", &k) != 1) return 0;

    char *s = (char *)malloc(100005 * sizeof(char));
    if (scanf("%s", s) != 1) {
        free(s);
        return 0;
    }

    // STARTER CODE BUG:
    // Incomplete O(N^3) brute force attempt with integer overflow
    int n = strlen(s);
    int max_len = 0;
    
    // Needs optimal sliding window or divide-and-conquer implementation
    printf("%d\\n", max_len);

    free(s);
    return 0;
}
`,
      java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line1 = br.readLine();
        if (line1 == null) return;
        int k = Integer.parseInt(line1.trim());
        String s = br.readLine();
        if (s == null) s = "";

        System.out.println(longestHarmonic(s.trim(), k));
    }

    private static int longestHarmonic(String s, int k) {
        if (s.length() < k) return 0;
        
        Map<Character, Integer> counts = new HashMap<>();
        for (char c : s.toCharArray()) counts.put(c, counts.getOrDefault(c, 0) + 1);

        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (counts.get(c) < k) {
                // BUG: Splitting into 2 parts instead of all continuous segments where c does not appear
                int left = longestHarmonic(s.substring(0, i), k);
                int right = longestHarmonic(s.substring(i + 1), k);
                return Math.max(left, right);
            }
        }
        return s.length();
    }
}
`
    },
    publicTests: [
      { id: "pub_2_1", input: "2\naaabbb", expectedOutput: "6", explanation: "All characters appear at least 2 times." },
      { id: "pub_2_2", input: "3\nababbc", expectedOutput: "0", explanation: "No character appears >= 3 times in any valid window." },
      { id: "pub_2_3", input: "2\naaBccBBaa", expectedOutput: "9", explanation: "All distinct characters meet the threshold k=2." },
      { id: "pub_2_4", input: "1\nabcdef", expectedOutput: "6", explanation: "For k=1, entire string is valid." }
    ],
    hiddenTests: [
      { id: "hid_2_1", input: "2\na", expectedOutput: "0" },
      { id: "hid_2_2", input: "1\na", expectedOutput: "1" },
      { id: "hid_2_3", input: "2\naa", expectedOutput: "2" },
      { id: "hid_2_4", input: "2\naAbBaA", expectedOutput: "6" },
      { id: "hid_2_5", input: "3\naaaaa", expectedOutput: "5" },
      { id: "hid_2_6", input: "2\nabcba", expectedOutput: "0" },
      { id: "hid_2_7", input: "2\nbaaabcb", expectedOutput: "3" },
      { id: "hid_2_8", input: "3\nweitongweitong", expectedOutput: "0" },
      { id: "hid_2_9", input: "2\nababbcbaabbc", expectedOutput: "10" },
      { id: "hid_2_10", input: "4\naaaabbbbaaaa", expectedOutput: "12" },
      { id: "hid_2_11", input: "2\n112233112233", expectedOutput: "12" },
      { id: "hid_2_12", input: "3\n11122111", expectedOutput: "3" },
      { id: "hid_2_13", input: "2\naabbccddee", expectedOutput: "10" },
      { id: "hid_2_14", input: "2\naabbccxddeeff", expectedOutput: "6" },
      { id: "hid_2_15", input: "5\naaaaabbbbb", expectedOutput: "10" },
      { id: "hid_2_16", input: "2\nzxyyxz", expectedOutput: "6" },
      { id: "hid_2_17", input: "3\naabbaabb", expectedOutput: "8" },
      { id: "hid_2_18", input: "4\nxyzxyzxyzxyz", expectedOutput: "12" },
      { id: "hid_2_19", input: "2\nAabbAA", expectedOutput: "4" },
      { id: "hid_2_20", input: "3\ncaaaacbbbb", expectedOutput: "4" }
    ]
  },

  // =========================================================================
  // PROBLEM 3: THE SILENT NETWORK
  // =========================================================================
  {
    id: "p3",
    number: 3,
    title: "The Silent Network",
    category: "Graph • Bridges • Connectivity • Tarjan's",
    difficulty: "VERY HARD",
    points: 100,
    timeLimit: 3,
    memoryLimit: "256 MB",
    description: `A top-secret server network has \`N\` data centers labeled \`1\` to \`N\` and \`M\` bidirectional fiber communication links.

A link is defined as a **Critical Bridge** if severing it strictly increases the number of connected components in the network.

However, each critical bridge has a traffic throughput capacity \`W_i\`. An attacker wants to isolate parts of the network by cutting the **minimum throughput critical bridge**.

Your task:
1. Identify all critical bridges in the network.
2. Output the **minimum capacity** among all critical bridges.
3. If no critical bridge exists (i.e. network is 2-edge connected or already completely severed without bridges), output \`-1\`.

### Input Format
- First line contains two integers \`N\` and \`M\` (number of nodes and edges).
- Next \`M\` lines each contain three integers \`u\`, \`v\`, \`w\` representing an edge between \`u\` and \`v\` with throughput capacity \`w\`.

### Output Format
- Print a single integer: minimum capacity among all critical bridges, or \`-1\`.

### Constraints
- \`1 <= N <= 10^5\`
- \`0 <= M <= 2 * 10^5\`
- \`1 <= u, v <= N\`, \`u != v\`
- \`1 <= w <= 10^9\`
- Duplicate edges between the same pair of nodes may exist! (A multiple edge can never be a bridge unless all copies are severed together).
- Optimal Time Complexity: \`O(N + M)\``,
    examples: [
      {
        input: "4 4\n1 2 10\n2 3 20\n3 4 15\n1 3 30",
        output: "15",
        explanation: "Cycle exists between 1-2-3-1. Edge (3, 4) with weight 15 is the only bridge. Min capacity is 15."
      },
      {
        input: "3 3\n1 2 5\n2 3 5\n3 1 5",
        output: "-1",
        explanation: "A triangle cycle. No bridge exists. Severing any single edge leaves the graph connected. Output -1."
      },
      {
        input: "5 4\n1 2 100\n2 3 50\n3 4 80\n4 5 20",
        output: "20",
        explanation: "A tree structure. All 4 edges are critical bridges. Min capacity is 20."
      }
    ],
    starters: {
      python: `import sys
# Increase recursion depth for deep graphs
sys.setrecursionlimit(200000)

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    N = int(lines[0])
    M = int(lines[1])
    
    # STARTER CODE BUG:
    # 1. Does not handle multi-edges between the same two nodes (multi-edges can NEVER be a single bridge!).
    # 2. Fails on disconnected graphs with multiple components.
    # 3. Recursion depth limit / stack overflow on linear chain of 100,000 nodes.
    adj = [[] for _ in range(N + 1)]
    idx = 2
    for _ in range(M):
        u = int(lines[idx]); v = int(lines[idx+1]); w = int(lines[idx+2])
        adj[u].append((v, w))
        adj[v].append((u, w))
        idx += 3

    tin = [0] * (N + 1)
    low = [0] * (N + 1)
    visited = [False] * (N + 1)
    timer = 0
    min_bridge = float('inf')

    def dfs(u, p):
        nonlocal timer, min_bridge
        visited[u] = True
        timer += 1
        tin[u] = low[u] = timer
        for to, w in adj[u]:
            if to == p:
                continue
            if visited[to]:
                low[u] = min(low[u], tin[to])
            else:
                dfs(to, u)
                low[u] = min(low[u], low[to])
                if low[to] > tin[u]:
                    min_bridge = min(min_bridge, w)

    # BUG: Only runs DFS from node 1; disconnected subgraphs missed!
    if N > 0:
        dfs(1, -1)

    print(min_bridge if min_bridge != float('inf') else -1)

if __name__ == "__main__":
    solve()
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

const long long INF = 2e18;
int timer_cnt = 0;
long long min_bridge = INF;

struct Edge {
    int to;
    long long w;
    int id;
};

// STARTER CODE BUG:
// Passing parent node instead of edge index causes multi-edges to be treated as back-edges,
// misclassifying multi-edges as bridges or vice-versa!
void dfs(int u, int p_node, const vector<vector<Edge>>& adj, vector<int>& tin, vector<int>& low, vector<bool>& vis) {
    vis[u] = true;
    tin[u] = low[u] = ++timer_cnt;

    for (const auto& edge : adj[u]) {
        if (edge.to == p_node) continue; // BUG: multi-edges between u and p_node are skipped!
        if (vis[edge.to]) {
            low[u] = min(low[u], tin[edge.to]);
        } else {
            dfs(edge.to, u, adj, tin, low, vis);
            low[u] = min(low[u], low[edge.to]);
            if (low[edge.to] > tin[u]) {
                min_bridge = min(min_bridge, edge.w);
            }
        }
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N, M;
    if (!(cin >> N >> M)) return 0;

    vector<vector<Edge>> adj(N + 1);
    for (int i = 0; i < M; i++) {
        int u, v;
        long long w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w, i});
        adj[v].push_back({u, w, i});
    }

    vector<int> tin(N + 1, 0), low(N + 1, 0);
    vector<bool> vis(N + 1, false);

    for (int i = 1; i <= N; i++) {
        if (!vis[i]) dfs(i, -1, adj, tin, low, vis);
    }

    cout << (min_bridge == INF ? -1 : min_bridge) << "\\n";
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int N, M;
    if (scanf("%d %d", &N, &M) != 2) return 0;

    // STARTER BUG: Incomplete graph memory allocation
    for (int i = 0; i < M; i++) {
        int u, v;
        long long w;
        scanf("%d %d %lld", &u, &v, &w);
    }

    printf("-1\\n");
    return 0;
}
`,
      java: `import java.io.*;
import java.util.*;

public class Main {
    static class Edge {
        int to;
        long weight;
        int id;
        Edge(int to, long weight, int id) {
            this.to = to;
            this.weight = weight;
            this.id = id;
        }
    }

    static long minBridge = Long.MAX_VALUE;
    static int timer = 0;

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        StringTokenizer st = new StringTokenizer(line);
        int N = Integer.parseInt(st.nextToken());
        int M = Integer.parseInt(st.nextToken());

        List<List<Edge>> adj = new ArrayList<>();
        for (int i = 0; i <= N; i++) adj.add(new ArrayList<>());

        for (int i = 0; i < M; i++) {
            st = new StringTokenizer(br.readLine());
            int u = Integer.parseInt(st.nextToken());
            int v = Integer.parseInt(st.nextToken());
            long w = Long.parseLong(st.nextToken());
            adj.get(u).add(new Edge(v, w, i));
            adj.get(v).add(new Edge(u, w, i));
        }

        // STARTER BUG: Parent edge ID not tracked, multi-edges fail
        int[] tin = new int[N + 1];
        int[] low = new int[N + 1];
        boolean[] vis = new boolean[N + 1];

        for (int i = 1; i <= N; i++) {
            if (!vis[i]) dfs(i, -1, adj, tin, low, vis);
        }

        System.out.println(minBridge == Long.MAX_VALUE ? -1 : minBridge);
    }

    static void dfs(int u, int p, List<List<Edge>> adj, int[] tin, int[] low, boolean[] vis) {
        vis[u] = true;
        tin[u] = low[u] = ++timer;
        for (Edge e : adj.get(u)) {
            if (e.to == p) continue;
            if (vis[e.to]) {
                low[u] = Math.min(low[u], tin[e.to]);
            } else {
                dfs(e.to, u, adj, tin, low, vis);
                low[u] = Math.min(low[u], low[e.to]);
                if (low[e.to] > tin[u]) {
                    minBridge = Math.min(minBridge, e.weight);
                }
            }
        }
    }
}
`
    },
    publicTests: [
      { id: "pub_3_1", input: "4 4\n1 2 10\n2 3 20\n3 4 15\n1 3 30", expectedOutput: "15", explanation: "Edge (3, 4) is the only bridge." },
      { id: "pub_3_2", input: "3 3\n1 2 5\n2 3 5\n3 1 5", expectedOutput: "-1", explanation: "No bridges in a 3-cycle." },
      { id: "pub_3_3", input: "5 4\n1 2 100\n2 3 50\n3 4 80\n4 5 20", expectedOutput: "20", explanation: "All edges are bridges. Minimum is 20." },
      { id: "pub_3_4", input: "2 1\n1 2 42", expectedOutput: "42", explanation: "Single bridge between 2 nodes." }
    ],
    hiddenTests: [
      { id: "hid_3_1", input: "3 2\n1 2 10\n2 3 5", expectedOutput: "5" },
      { id: "hid_3_2", input: "4 3\n1 2 100\n1 3 200\n1 4 50", expectedOutput: "50" },
      { id: "hid_3_3", input: "4 2\n1 2 10\n3 4 20", expectedOutput: "10" },
      { id: "hid_3_4", input: "3 0", expectedOutput: "-1" },
      { id: "hid_3_5", input: "4 5\n1 2 10\n2 3 20\n3 4 30\n4 1 40\n1 3 50", expectedOutput: "-1" },
      { id: "hid_3_6", input: "6 7\n1 2 10\n2 3 20\n3 1 30\n3 4 5\n4 5 40\n5 6 50\n6 4 60", expectedOutput: "5" },
      { id: "hid_3_7", input: "5 5\n1 2 10\n2 3 20\n3 4 30\n4 2 40\n4 5 12", expectedOutput: "10" },
      { id: "hid_3_8", input: "2 2\n1 2 10\n1 2 20", expectedOutput: "-1" },
      { id: "hid_3_9", input: "3 4\n1 2 10\n1 2 20\n2 3 30\n2 3 40", expectedOutput: "-1" },
      { id: "hid_3_10", input: "4 4\n1 2 15\n1 2 25\n2 3 50\n3 4 60", expectedOutput: "50" },
      { id: "hid_3_11", input: "6 5\n1 2 10\n2 3 20\n3 4 30\n4 5 40\n5 6 50", expectedOutput: "10" },
      { id: "hid_3_12", input: "5 6\n1 2 1\n2 3 2\n3 1 3\n3 4 100\n4 5 4\n5 4 5", expectedOutput: "100" },
      { id: "hid_3_13", input: "7 7\n1 2 10\n2 3 20\n3 1 30\n4 5 40\n5 6 50\n6 4 60\n3 4 999", expectedOutput: "999" },
      { id: "hid_3_14", input: "8 8\n1 2 8\n2 3 7\n3 4 6\n4 1 5\n5 6 4\n6 7 3\n7 8 2\n8 5 1", expectedOutput: "-1" },
      { id: "hid_3_15", input: "3 1\n1 2 77", expectedOutput: "77" },
      { id: "hid_3_16", input: "5 4\n1 2 5\n2 3 5\n3 4 5\n4 5 5", expectedOutput: "5" },
      { id: "hid_3_17", input: "6 6\n1 2 10\n2 3 20\n3 1 30\n4 5 40\n5 6 50\n6 4 60", expectedOutput: "-1" },
      { id: "hid_3_18", input: "4 3\n1 2 1000000000\n2 3 999999999\n3 4 888888888", expectedOutput: "888888888" },
      { id: "hid_3_19", input: "5 6\n1 2 10\n2 3 20\n3 4 30\n4 1 40\n2 4 50\n3 5 1", expectedOutput: "1" },
      { id: "hid_3_20", input: "3 3\n1 2 10\n2 3 20\n1 3 30", expectedOutput: "-1" }
    ]
  },

  // =========================================================================
  // PROBLEM 4: THE GREEDY LIE
  // =========================================================================
  {
    id: "p4",
    number: 4,
    title: "The Greedy Lie",
    category: "Dynamic Programming • State Transitions • Anti-Greedy",
    difficulty: "EXTREME",
    points: 100,
    timeLimit: 4,
    memoryLimit: "256 MB",
    description: `A quantum cryptographic system processes a stream of \`N\` energy packets indexed \`0\` to \`N - 1\`.
Each packet \`i\` has an energy value \`E[i]\` and a charge type \`C[i]\` where \`C[i] ∈ {+1, -1}\`.

You must select a subsequence of packets to maximize the **Total System Power**.
However, the physics of the system enforces two quantum constraints:
1. **No Two Adjacent Selection**: You cannot select two immediately adjacent packets in the original sequence (i.e. if you pick index \`i\`, you cannot pick \`i + 1\`).
2. **Alternating Charge Requirement**: For any two sequentially chosen packets in your subsequence, their charge types **MUST alternate**:
   - If the previous chosen packet had charge \`+1\`, the next chosen packet must have charge \`-1\`.
   - If the previous chosen packet had charge \`-1\`, the next chosen packet must have charge \`+1\`.
   - The first packet in your chosen subsequence can have either charge \`+1\` or \`-1\`.

If no packets are chosen, the power is \`0\`. Notice energy values \`E[i]\` can be **negative**, positive, or zero!

Find the **maximum possible Total System Power**.

### Input Format
- First line contains an integer \`N\`.
- Second line contains \`N\` space-separated integers representing \`E[0], E[1], ..., E[N-1]\`.
- Third line contains \`N\` space-separated integers representing \`C[0], C[1], ..., C[N-1]\` (each either 1 or -1).

### Output Format
- Print a single integer representing the maximum system power.

### Constraints
- \`1 <= N <= 2 * 10^5\`
- \`-10^9 <= E[i] <= 10^9\`
- \`C[i] ∈ {-1, 1}\`
- A greedy approach of "always pick the largest positive valid packet" fails on alternating sequences and negative traps!
- Optimal Time Complexity: \`O(N)\` Dynamic Programming with constant space state compression.`,
    examples: [
      {
        input: "5\n10 20 15 30 10\n1 -1 1 -1 1",
        output: "50",
        explanation: "Pick index 1 (E=20, C=-1) and index 3 (E=30, C=1). Not adjacent (1 and 3). Charges alternate (-1 then +1). Sum = 20 + 30 = 50."
      },
      {
        input: "4\n-5 -2 -8 -1\n1 -1 1 -1",
        output: "0",
        explanation: "All packets yield negative energy. The optimal choice is selecting 0 packets, yielding 0."
      },
      {
        input: "6\n100 1 100 1 100 1\n1 1 1 1 1 1",
        output: "100",
        explanation: "All charges are +1. Because charges must alternate (+1, -1, +1...), you can pick AT MOST ONE packet! Best is 100."
      }
    ],
    starters: {
      python: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    N = int(lines[0])
    E = [int(x) for x in lines[1:1+N]]
    C = [int(x) for x in lines[1+N:1+2*N]]

    # STARTER CODE BUG:
    # 1. Greedy choice of largest immediate element traps the alternating sequence.
    # 2. Does not account for starting with either +1 or -1 charge state.
    # 3. Adjacency rule i and i+1 check is bypassed on negative jumps.
    
    # Needs DP state:
    # dp[i][last_charge] = max power up to index i
    total_power = 0
    last_picked_idx = -2
    last_charge = 0

    for i in range(N):
        if i > last_picked_idx + 1:
            if last_charge == 0 or C[i] != last_charge:
                if E[i] > 0:
                    total_power += E[i]
                    last_picked_idx = i
                    last_charge = C[i]

    print(total_power)

if __name__ == "__main__":
    solve()
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    if (!(cin >> N)) return 0;

    vector<long long> E(N);
    for (int i = 0; i < N; i++) cin >> E[i];

    vector<int> C(N);
    for (int i = 0; i < N; i++) cin >> C[i];

    // STARTER BUG:
    // Flawed greedy heuristic that fails on cases where taking a smaller positive number
    // unlocks a massive subsequent alternating number.
    long long ans = 0;
    int last_idx = -2;
    int last_c = 0;

    for (int i = 0; i < N; i++) {
        if (i >= last_idx + 2 && (last_c == 0 || C[i] != last_c)) {
            if (E[i] > 0) {
                ans += E[i];
                last_idx = i;
                last_c = C[i];
            }
        }
    }

    cout << ans << "\\n";
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int N;
    if (scanf("%d", &N) != 1) return 0;

    long long *E = (long long *)malloc(sizeof(long long) * N);
    int *C = (int *)malloc(sizeof(int) * N);

    for (int i = 0; i < N; i++) scanf("%lld", &E[i]);
    for (int i = 0; i < N; i++) scanf("%d", &C[i]);

    // STARTER BUG: Requires 2D DP state tracking last chosen charge
    printf("0\\n");

    free(E);
    free(C);
    return 0;
}
`,
      java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int N = Integer.parseInt(line.trim());

        StringTokenizer st = new StringTokenizer(br.readLine());
        long[] E = new long[N];
        for (int i = 0; i < N; i++) E[i] = Long.parseLong(st.nextToken());

        st = new StringTokenizer(br.readLine());
        int[] C = new int[N];
        for (int i = 0; i < N; i++) C[i] = Integer.parseInt(st.nextToken());

        // STARTER BUG: Greedy heuristic fails on alternating transitions
        long power = 0;
        int lastIdx = -2;
        int lastC = 0;

        for (int i = 0; i < N; i++) {
            if (i >= lastIdx + 2 && (lastC == 0 || C[i] != lastC)) {
                if (E[i] > 0) {
                    power += E[i];
                    lastIdx = i;
                    lastC = C[i];
                }
            }
        }

        System.out.println(power);
    }
}
`
    },
    publicTests: [
      { id: "pub_4_1", input: "5\n10 20 15 30 10\n1 -1 1 -1 1", expectedOutput: "50", explanation: "Pick index 1 (20, -1) and index 3 (30, 1). Total 50." },
      { id: "pub_4_2", input: "4\n-5 -2 -8 -1\n1 -1 1 -1", expectedOutput: "0", explanation: "All negative, pick none for 0." },
      { id: "pub_4_3", input: "6\n100 1 100 1 100 1\n1 1 1 1 1 1", expectedOutput: "100", explanation: "Cannot alternate charge, max pick is 1 packet." },
      { id: "pub_4_4", input: "5\n50 10 10 10 100\n1 1 1 1 -1", expectedOutput: "150", explanation: "Pick index 0 (50, 1) and index 4 (100, -1). Sum 150." }
    ],
    hiddenTests: [
      { id: "hid_4_1", input: "1\n50\n1", expectedOutput: "50" },
      { id: "hid_4_2", input: "1\n-50\n1", expectedOutput: "0" },
      { id: "hid_4_3", input: "2\n10 20\n1 -1", expectedOutput: "20" },
      { id: "hid_4_4", input: "3\n10 50 10\n1 -1 1", expectedOutput: "50" },
      { id: "hid_4_5", input: "3\n30 10 30\n1 -1 1", expectedOutput: "60" },
      { id: "hid_4_6", input: "4\n100 5 5 100\n1 -1 1 -1", expectedOutput: "200" },
      { id: "hid_4_7", input: "5\n10 10 10 10 10\n1 -1 1 -1 1", expectedOutput: "30" },
      { id: "hid_4_8", input: "5\n100 -50 100 -50 100\n1 -1 1 -1 1", expectedOutput: "100" },
      { id: "hid_4_9", input: "6\n1 20 1 1 30 1\n1 -1 1 1 1 -1", expectedOutput: "50" },
      { id: "hid_4_10", input: "5\n99 100 1 99 100\n1 1 1 1 1", expectedOutput: "100" },
      { id: "hid_4_11", input: "6\n10 100 10 10 100 10\n1 -1 1 1 -1 1", expectedOutput: "110" },
      { id: "hid_4_12", input: "7\n50 20 40 10 60 30 50\n1 -1 1 -1 1 -1 1", expectedOutput: "160" },
      { id: "hid_4_13", input: "4\n100 10 1000 10\n1 1 -1 -1", expectedOutput: "1100" },
      { id: "hid_4_14", input: "5\n-10 -20 50 -10 -20\n1 -1 1 -1 1", expectedOutput: "50" },
      { id: "hid_4_15", input: "6\n40 10 10 50 10 60\n-1 1 -1 1 -1 1", expectedOutput: "150" },
      { id: "hid_4_16", input: "8\n10 20 30 40 50 60 70 80\n1 -1 1 -1 1 -1 1 -1", expectedOutput: "200" },
      { id: "hid_4_17", input: "5\n10 20 30 40 50\n-1 -1 -1 -1 -1", expectedOutput: "50" },
      { id: "hid_4_18", input: "6\n1000000000 1 1000000000 1 1000000000 1\n1 -1 1 -1 1 -1", expectedOutput: "3000000000" },
      { id: "hid_4_19", input: "4\n10 20 15 25\n1 1 -1 -1", expectedOutput: "35" },
      { id: "hid_4_20", input: "5\n0 0 0 0 0\n1 -1 1 -1 1", expectedOutput: "0" }
    ]
  }
];
