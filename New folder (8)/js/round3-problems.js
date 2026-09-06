/**
 * TECHNORA'26 — ROUND 3: FINAL BOSS
 * Problem Bank Specification (2 Hard+ Advanced Assessment Problems)
 * 
 * Total: 500 Marks (250 Marks each)
 * Problems:
 * 1. THE VANISHING STATE (Hard+) — Graph • State-Tracking Dijkstra/BFS • Bitmask • Optimization Traps
 * 2. THE LAST PARADOX (Hard+) — Dynamic Programming • Anti-Greedy Trap • Recurrence • Large Constraints
 * 
 * Approximately 60 lines of realistic starter code per language with subtle logical bugs.
 */

export const ROUND3_PROBLEMS = [
  // =========================================================================
  // PROBLEM 1: THE VANISHING STATE
  // =========================================================================
  {
    id: "p1",
    number: 1,
    title: "The Vanishing State",
    category: "Graph • Multi-Dimensional Dijkstra • State Tracking • Bitmask",
    difficulty: "HARD+",
    points: 250,
    timeLimit: 3,
    memoryLimit: "256 MB",
    description: `In an advanced quantum computing network, data packets must travel from server \`1\` to server \`N\`.

The network consists of \`N\` servers connected by \`M\` directed communication channels. Each channel from \`u\` to \`v\` takes \`w\` nanoseconds of propagation delay.

However, \`K\` special servers are **Quantum Relay Stations** (labeled with station indices \`0\` to \`K - 1\`). When a packet visits relay station \`i\`, it collects quantum charge bit \`i\`.

A channel from \`u\` to \`v\` may require a specific **Security Bitmask Key** \`req_mask\`. A packet can ONLY traverse that channel if it has ALREADY collected ALL the charge bits specified in \`req_mask\` (i.e., \`(collected_mask & req_mask) == req_mask\`).

Find the **minimum total time** to travel from server \`1\` to server \`N\`.
- The packet starts at server \`1\` with \`collected_mask = 0\` at \`time = 0\`. If server \`1\` is a relay station, its charge is collected immediately.
- If it is impossible to reach server \`N\`, return \`-1\`.

### Input Format
- First line contains three integers \`N\`, \`M\`, and \`K\`.
- Second line contains \`K\` space-separated integers representing the server IDs of the \`K\` relay stations (station index \`0\` to \`K - 1\`).
- Next \`M\` lines each contain 4 integers: \`u\`, \`v\`, \`w\`, \`req_mask\`.

### Output Format
- Print a single integer: minimum transmission delay to reach server \`N\`, or \`-1\`.

### Constraints
- \`1 <= N <= 1000\`
- \`0 <= M <= 5000\`
- \`0 <= K <= 8\` (bitmask size up to 2^8 = 256)
- \`1 <= w <= 10^7\`
- \`0 <= req_mask < 2^K\`
- Graph may contain directed cycles and multiple edges between nodes.
- Optimal Complexity: \`O((N \\cdot 2^K + M \\cdot 2^K) \\log(N \\cdot 2^K))\``,
    examples: [
      {
        input: "4 4 1\n2\n1 2 5 0\n2 4 10 1\n1 3 2 0\n3 4 50 0",
        output: "15",
        explanation: "Relay station 0 is at server 2. Path 1 -> 2 collects bit 0 (time 5). Channel 2 -> 4 requires bitmask 1 (bit 0), which is now satisfied. Time = 5 + 10 = 15. Alternative path 1 -> 3 -> 4 takes 2 + 50 = 52. Min is 15."
      },
      {
        input: "3 2 1\n2\n1 3 10 1\n1 2 20 0",
        output: "-1",
        explanation: "Server 3 requires bit 0. Only server 2 gives bit 0, but there is no path from 2 to 3. Impossible, so output -1."
      }
    ],
    starters: {
      python: `import sys
import heapq

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    
    N = int(lines[0])
    M = int(lines[1])
    K = int(lines[2])
    
    relay_stations = {}
    idx = 3
    for i in range(K):
        server_id = int(lines[idx])
        relay_stations[server_id] = i
        idx += 1

    adj = [[] for _ in range(N + 1)]
    for _ in range(M):
        u = int(lines[idx]); v = int(lines[idx+1])
        w = int(lines[idx+2]); req = int(lines[idx+3])
        adj[u].append((v, w, req))
        idx += 4

    # STARTER CODE BUGS:
    # 1. State distance table only tracks distance per node, omitting mask state -> fails on cycles and revisits!
    # 2. Starting node 1 charge mask is not collected if node 1 is itself a relay station.
    # 3. Priority queue pushes (node, mask, dist) instead of (dist, node, mask), ruining min-heap order!
    dist = {}
    initial_mask = 0
    if 1 in relay_stations:
        initial_mask |= (1 << relay_stations[1])

    # BUG: heapq orders by first tuple element; putting node first breaks Dijkstra!
    pq = [(1, initial_mask, 0)]
    dist[(1, initial_mask)] = 0
    ans = -1

    while pq:
        # BUG: unpacking in wrong order due to heap tuple
        curr_node, curr_mask, curr_d = heapq.heappop(pq)

        if curr_node == N:
            ans = curr_d
            break

        if curr_d > dist.get((curr_node, curr_mask), float('inf')):
            continue

        for v, w, req in adj[curr_node]:
            # Check mask requirement
            if (curr_mask & req) == req:
                next_mask = curr_mask
                if v in relay_stations:
                    next_mask |= (1 << relay_stations[v])

                new_d = curr_d + w
                if new_d < dist.get((v, next_mask), float('inf')):
                    dist[(v, next_mask)] = new_d
                    heapq.heappush(pq, (v, next_mask, new_d))

    print(ans)

if __name__ == "__main__":
    solve()
`,
      cpp: `#include <iostream>
#include <vector>
#include <queue>
#include <tuple>
#include <unordered_map>

using namespace std;

const long long INF = 1e18;

struct Edge {
    int to;
    long long w;
    int req;
};

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N, M, K;
    if (!(cin >> N >> M >> K)) return 0;

    unordered_map<int, int> relay_bit;
    for (int i = 0; i < K; i++) {
        int s; cin >> s;
        relay_bit[s] = i;
    }

    vector<vector<Edge>> adj(N + 1);
    for (int i = 0; i < M; i++) {
        int u, v, req;
        long long w;
        cin >> u >> v >> w >> req;
        adj[u].push_back({v, w, req});
    }

    // STARTER BUG:
    // 1. Initial mask for node 1 is neglected if 1 is a relay station.
    // 2. 2D distance vector initialized with 32-bit INT_MAX causing overflow on large weights.
    // 3. Priority queue comparator is max-heap by default in C++ (less<T>), needs greater<T>!
    int max_mask = 1 << K;
    vector<vector<long long>> dist(N + 1, vector<long long>(max_mask, INF));

    int start_mask = 0;
    if (relay_bit.count(1)) start_mask |= (1 << relay_bit[1]);

    // BUG: priority_queue in C++ is max-heap unless greater is specified!
    priority_queue<tuple<long long, int, int>> pq;
    dist[1][start_mask] = 0;
    pq.push({0, 1, start_mask});

    long long ans = -1;
    while (!pq.empty()) {
        auto [d, u, mask] = pq.top();
        pq.pop();

        if (u == N) {
            ans = d;
            break;
        }

        if (d > dist[u][mask]) continue;

        for (auto& edge : adj[u]) {
            if ((mask & edge.req) == edge.req) {
                int next_mask = mask;
                if (relay_bit.count(edge.to)) next_mask |= (1 << relay_bit[edge.to]);

                if (d + edge.w < dist[edge.to][next_mask]) {
                    dist[edge.to][next_mask] = d + edge.w;
                    pq.push({d + edge.w, edge.to, next_mask});
                }
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
    int N, M, K;
    if (scanf("%d %d %d", &N, &M, &K) != 3) return 0;

    int *relays = (int *)malloc(sizeof(int) * K);
    for (int i = 0; i < K; i++) scanf("%d", &relays[i]);

    // Incomplete graph state implementation...
    // Requires state-expanded 2D Dijkstra (Node x Mask)
    printf("-1\\n");

    free(relays);
    return 0;
}
`,
      java: `import java.io.*;
import java.util.*;

public class Main {
    static class Edge {
        int to;
        long weight;
        int reqMask;
        Edge(int to, long weight, int reqMask) {
            this.to = to;
            this.weight = weight;
            this.reqMask = reqMask;
        }
    }

    static class State implements Comparable<State> {
        int node;
        int mask;
        long dist;
        State(int node, int mask, long dist) {
            this.node = node;
            this.mask = mask;
            this.dist = dist;
        }
        public int compareTo(State o) {
            return Long.compare(this.dist, o.dist);
        }
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        StringTokenizer st = new StringTokenizer(line);
        int N = Integer.parseInt(st.nextToken());
        int M = Integer.parseInt(st.nextToken());
        int K = Integer.parseInt(st.nextToken());

        Map<Integer, Integer> relayMap = new HashMap<>();
        if (K > 0) {
            st = new StringTokenizer(br.readLine());
            for (int i = 0; i < K; i++) relayMap.put(Integer.parseInt(st.nextToken()), i);
        }

        List<List<Edge>> adj = new ArrayList<>();
        for (int i = 0; i <= N; i++) adj.add(new ArrayList<>());

        for (int i = 0; i < M; i++) {
            st = new StringTokenizer(br.readLine());
            int u = Integer.parseInt(st.nextToken());
            int v = Integer.parseInt(st.nextToken());
            long w = Long.parseLong(st.nextToken());
            int req = Integer.parseInt(st.nextToken());
            adj.get(u).add(new Edge(v, w, req));
        }

        // STARTER BUG: Start mask does not check if start node 1 is a relay
        long[][] dist = new long[N + 1][1 << K];
        for (long[] row : dist) Arrays.fill(row, Long.MAX_VALUE);

        int startMask = 0;
        // Missing: if (relayMap.containsKey(1)) startMask |= (1 << relayMap.get(1));
        dist[1][startMask] = 0;

        PriorityQueue<State> pq = new PriorityQueue<>();
        pq.add(new State(1, startMask, 0));

        long ans = -1;
        while (!pq.isEmpty()) {
            State curr = pq.poll();
            if (curr.node == N) {
                ans = curr.dist;
                break;
            }
            if (curr.dist > dist[curr.node][curr.mask]) continue;

            for (Edge e : adj.get(curr.node)) {
                if ((curr.mask & e.reqMask) == e.reqMask) {
                    int nextMask = curr.mask;
                    if (relayMap.containsKey(e.to)) nextMask |= (1 << relayMap.get(e.to));

                    if (curr.dist + e.weight < dist[e.to][nextMask]) {
                        dist[e.to][nextMask] = curr.dist + e.weight;
                        pq.add(new State(e.to, nextMask, dist[e.to][nextMask]));
                    }
                }
            }
        }

        System.out.println(ans);
    }
}
`
    },
    publicTests: [
      { id: "pub_r3_1_1", input: "4 4 1\n2\n1 2 5 0\n2 4 10 1\n1 3 2 0\n3 4 50 0", expectedOutput: "15", explanation: "Optimal path traverses relay at node 2 and reaches node 4 in 15ns." },
      { id: "pub_r3_1_2", input: "3 2 1\n2\n1 3 10 1\n1 2 20 0", expectedOutput: "-1", explanation: "Target unreachable due to unsatisfied mask." },
      { id: "pub_r3_1_3", input: "3 2 0\n\n1 2 5 0\n2 3 5 0", expectedOutput: "10", explanation: "K=0 simple shortest path." },
      { id: "pub_r3_1_4", input: "1 0 0\n\n", expectedOutput: "0", explanation: "Source equals destination, 0 nanoseconds." }
    ],
    hiddenTests: [
      { id: "hid_r3_1_1", input: "2 1 0\n\n1 2 100", expectedOutput: "100" },
      { id: "hid_r3_1_2", input: "2 0 0\n\n", expectedOutput: "-1" },
      { id: "hid_r3_1_3", input: "4 5 2\n2 3\n1 2 10 0\n2 3 10 1\n3 4 10 3\n1 4 100 0\n1 3 5 0", expectedOutput: "30" },
      { id: "hid_r3_1_4", input: "3 3 1\n1\n1 2 10 1\n2 3 10 1\n1 3 100 0", expectedOutput: "20" },
      { id: "hid_r3_1_5", input: "5 4 0\n\n1 2 1\n2 3 2\n3 4 3\n4 5 4", expectedOutput: "10" },
      { id: "hid_r3_1_6", input: "3 3 1\n2\n1 2 10 0\n2 1 10 1\n1 3 10 1", expectedOutput: "30" },
      { id: "hid_r3_1_7", input: "4 3 1\n2\n1 2 5 0\n2 3 5 0\n3 4 5 2", expectedOutput: "-1" },
      { id: "hid_r3_1_8", input: "5 6 2\n2 4\n1 2 5 0\n2 3 5 1\n3 4 5 1\n4 5 5 3\n1 5 100 0\n2 5 50 1", expectedOutput: "20" },
      { id: "hid_r3_1_9", input: "3 4 0\n\n1 2 10 0\n1 2 5 0\n2 3 20 0\n2 3 15 0", expectedOutput: "20" },
      { id: "hid_r3_1_10", input: "4 4 1\n2\n1 2 100 0\n2 2 10 1\n2 4 100 1\n1 4 500 0", expectedOutput: "200" },
      { id: "hid_r3_1_11", input: "6 7 2\n3 5\n1 2 1 0\n2 3 2 0\n3 4 3 1\n4 5 4 1\n5 6 5 3\n1 6 100 0\n3 6 50 1", expectedOutput: "15" },
      { id: "hid_r3_1_12", input: "3 2 1\n3\n1 2 10 0\n2 3 10 0", expectedOutput: "20" },
      { id: "hid_r3_1_13", input: "4 2 0\n\n1 2 10 0\n3 4 10 0", expectedOutput: "-1" },
      { id: "hid_r3_1_14", input: "5 5 1\n2\n1 2 10 0\n2 3 10 0\n3 2 10 0\n3 4 10 0\n4 5 10 1", expectedOutput: "40" },
      { id: "hid_r3_1_15", input: "2 2 1\n1\n1 2 50 0\n1 2 10 1", expectedOutput: "10" },
      { id: "hid_r3_1_16", input: "4 4 3\n2 3 4\n1 2 1 0\n2 3 2 1\n3 4 3 3\n1 4 100 0", expectedOutput: "6" },
      { id: "hid_r3_1_17", input: "3 1 1\n2\n1 2 10 0", expectedOutput: "-1" },
      { id: "hid_r3_1_18", input: "5 6 1\n3\n1 2 10 0\n2 3 10 0\n3 4 10 1\n4 5 10 1\n1 5 1000 0\n2 5 200 0", expectedOutput: "40" },
      { id: "hid_r3_1_19", input: "4 3 0\n\n1 2 10000000 0\n2 3 10000000 0\n3 4 10000000 0", expectedOutput: "30000000" },
      { id: "hid_r3_1_20", input: "3 3 2\n1 2\n1 2 10 1\n2 3 10 3\n1 3 50 0", expectedOutput: "20" }
    ]
  },

  // =========================================================================
  // PROBLEM 2: THE LAST PARADOX
  // =========================================================================
  {
    id: "p2",
    number: 2,
    title: "The Last Paradox",
    category: "Dynamic Programming • State Recurrence • Anti-Greedy • Optimization",
    difficulty: "HARD+",
    points: 250,
    timeLimit: 3,
    memoryLimit: "256 MB",
    description: `A temporal anomaly has fractured spacetime into \`N\` unstable event intervals indexed \`0\` to \`N - 1\`.

Each event interval \`i\` is characterized by:
- \`L[i]\`: Start timestamp
- \`R[i]\`: End timestamp (\`L[i] < R[i]\`)
- \`V[i]\`: Temporal energy value
- \`T[i]\`: Timeline domain type (an integer from \`1\` to \`3\`)

You need to stabilize the anomaly by selecting a subset of **mutually compatible** event intervals:
1. **Non-Overlapping**: No two chosen intervals can overlap in time (i.e., if interval \`A\` ends at \`R[A]\`, the next chosen interval \`B\` must satisfy \`L[B] >= R[A]\`).
2. **Timeline Transition Tax**: If you transition between two consecutive chosen intervals \`A\` and \`B\`:
   - If they belong to the **same** timeline domain (\`T[A] == T[B]\`), there is **no penalty**.
   - If they belong to **different** timeline domains (\`T[A] != T[B]\`), a cross-domain tax of \`P\` energy points is deducted from your total.
   - The first selected interval does not incur any transition tax.

If no intervals are selected, the stabilized energy is \`0\`. Notice individual energy values \`V[i]\` can be **positive, zero, or negative**!

Find the **maximum net energy** achievable.

### Input Format
- First line contains two integers \`N\` and \`P\` (number of intervals and transition tax).
- Next \`N\` lines each contain four integers: \`L[i]\`, \`R[i]\`, \`V[i]\`, \`T[i]\`.

### Output Format
- Print a single integer representing the maximum net energy.

### Constraints
- \`1 <= N <= 10^5\`
- \`0 <= P <= 10^9\`
- \`0 <= L[i] < R[i] <= 10^9\`
- \`-10^9 <= V[i] <= 10^9\`
- \`T[i] ∈ {1, 2, 3}\`
- A greedy strategy (e.g., sorting by earliest finish time \`R[i]\` or highest \`V[i]\`) fails completely due to domain transition taxes and negative traps!
- Optimal Complexity: \`O(N \\log N)\` DP using binary search / segment tree / coordinate compression.`,
    examples: [
      {
        input: "3 10\n1 5 100 1\n6 10 100 2\n6 10 80 1",
        output: "190",
        explanation: "Choice A: Interval 1 (V=100, T=1) + Interval 2 (V=100, T=2). Cross-domain tax P=10 deducted: 100 + 100 - 10 = 190. Choice B: Interval 1 (T=1) + Interval 3 (V=80, T=1). Same domain, no tax: 100 + 80 = 180. Max is 190."
      },
      {
        input: "3 50\n1 4 40 1\n4 8 40 2\n1 8 70 1",
        output: "70",
        explanation: "Taking interval 1 and 2 yields 40 + 40 - 50 = 30. Taking interval 3 alone yields 70. Greedy earliest finish fails. Max is 70."
      },
      {
        input: "2 20\n1 5 -10 1\n6 10 -20 2",
        output: "0",
        explanation: "All intervals yield negative net energy. Optimal choice is selecting zero intervals, yielding 0."
      }
    ],
    starters: {
      python: `import sys
import bisect

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    
    N = int(lines[0])
    P = int(lines[1])

    intervals = []
    idx = 2
    for _ in range(N):
        l = int(lines[idx]); r = int(lines[idx+1])
        v = int(lines[idx+2]); t = int(lines[idx+3])
        intervals.append((l, r, v, t))
        idx += 4

    # STARTER CODE BUGS:
    # 1. Greedy sort by earliest finish time R[i] without tracking 3-state domain transitions (T=1, 2, 3).
    # 2. Binary search on start times assumes 1-based indexing, causing index shift off-by-one errors.
    # 3. Transitions omit the P penalty when domains switch!
    intervals.sort(key=lambda x: x[1])  # Sort by end time R

    # Needs DP state:
    # dp[i][last_t] = max profit considering first i intervals where last chosen was domain last_t
    R_vals = [x[1] for x in intervals]
    
    # FLAWED GREEDY ATTEMPT:
    total_val = 0
    last_end = -1
    last_domain = 0

    for l, r, v, t in intervals:
        if l >= last_end and v > 0:
            tax = P if (last_domain != 0 and last_domain != t) else 0
            if v - tax > 0:
                total_val += (v - tax)
                last_end = r
                last_domain = t

    print(total_val)

if __name__ == "__main__":
    solve()
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

struct Interval {
    long long l, r, v;
    int t;
};

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    long long P;
    if (!(cin >> N >> P)) return 0;

    vector<Interval> a(N);
    for (int i = 0; i < N; i++) {
        cin >> a[i].l >> a[i].r >> a[i].v >> a[i].t;
    }

    // STARTER BUG:
    // Flawed greedy heuristic that selects locally highest (v - tax),
    // failing when taking a lower value preserves domain alignment or unblocks better future intervals.
    sort(a.begin(), a.end(), [](const Interval& x, const Interval& y) {
        return x.r < y.r;
    });

    long long ans = 0;
    long long last_end = -1;
    int last_t = 0;

    for (int i = 0; i < N; i++) {
        if (a[i].l >= last_end) {
            long long tax = (last_t != 0 && last_t != a[i].t) ? P : 0;
            if (a[i].v - tax > 0) {
                ans += (a[i].v - tax);
                last_end = a[i].r;
                last_t = a[i].t;
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
    long long P;
    if (scanf("%d %lld", &N, &P) != 2) return 0;

    // STARTER BUG: Incomplete DP recurrence and memory allocation
    for (int i = 0; i < N; i++) {
        long long l, r, v;
        int t;
        scanf("%lld %lld %lld %d", &l, &r, &v, &t);
    }

    printf("0\\n");
    return 0;
}
`,
      java: `import java.io.*;
import java.util.*;

public class Main {
    static class Interval implements Comparable<Interval> {
        long l, r, v;
        int t;
        Interval(long l, long r, long v, int t) {
            this.l = l;
            this.r = r;
            this.v = v;
            this.t = t;
        }
        public int compareTo(Interval o) {
            return Long.compare(this.r, o.r);
        }
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        StringTokenizer st = new StringTokenizer(line);
        int N = Integer.parseInt(st.nextToken());
        long P = Long.parseLong(st.nextToken());

        List<Interval> list = new ArrayList<>();
        for (int i = 0; i < N; i++) {
            st = new StringTokenizer(br.readLine());
            long l = Long.parseLong(st.nextToken());
            long r = Long.parseLong(st.nextToken());
            long v = Long.parseLong(st.nextToken());
            int t = Integer.parseInt(st.nextToken());
            list.add(new Interval(l, r, v, t));
        }

        // STARTER BUG: Requires coordinate-compressed DP or binary search DP on end times
        Collections.sort(list);

        long ans = 0;
        long lastEnd = -1;
        int lastT = 0;

        for (Interval iv : list) {
            if (iv.l >= lastEnd) {
                long tax = (lastT != 0 && lastT != iv.t) ? P : 0;
                if (iv.v - tax > 0) {
                    ans += (iv.v - tax);
                    lastEnd = iv.r;
                    lastT = iv.t;
                }
            }
        }

        System.out.println(ans);
    }
}
`
    },
    publicTests: [
      { id: "pub_r3_2_1", input: "3 10\n1 5 100 1\n6 10 100 2\n6 10 80 1", expectedOutput: "190", explanation: "Pick interval 1 & 2 with cross-domain tax P=10 -> 100 + 100 - 10 = 190." },
      { id: "pub_r3_2_2", input: "3 50\n1 4 40 1\n4 8 40 2\n1 8 70 1", expectedOutput: "70", explanation: "Interval 3 alone yields 70 > 30 from intervals 1 and 2 with tax." },
      { id: "pub_r3_2_3", input: "2 20\n1 5 -10 1\n6 10 -20 2", expectedOutput: "0", explanation: "All negative, pick none for 0." },
      { id: "pub_r3_2_4", input: "4 0\n1 3 50 1\n3 5 50 2\n5 7 50 3\n7 9 50 1", expectedOutput: "200", explanation: "Tax P=0, all non-overlapping can be combined for 200." }
    ],
    hiddenTests: [
      { id: "hid_r3_2_1", input: "1 10\n1 10 50 1", expectedOutput: "50" },
      { id: "hid_r3_2_2", input: "1 10\n1 10 -50 1", expectedOutput: "0" },
      { id: "hid_r3_2_3", input: "2 10\n1 5 50 1\n2 6 100 1", expectedOutput: "100" },
      { id: "hid_r3_2_4", input: "3 10\n1 4 30 1\n4 7 30 1\n7 10 30 1", expectedOutput: "90" },
      { id: "hid_r3_2_5", input: "4 20\n1 4 50 1\n4 8 50 2\n8 12 50 1\n1 12 110 1", expectedOutput: "110" },
      { id: "hid_r3_2_6", input: "3 100\n1 5 80 1\n5 10 80 2\n1 10 90 1", expectedOutput: "90" },
      { id: "hid_r3_2_7", input: "5 10\n1 3 20 1\n3 5 20 1\n5 7 20 1\n7 9 20 1\n9 11 20 1", expectedOutput: "100" },
      { id: "hid_r3_2_8", input: "4 15\n1 5 100 1\n6 10 100 2\n11 15 100 3\n16 20 100 1", expectedOutput: "355" },
      { id: "hid_r3_2_9", input: "2 10\n0 100 1000 1\n5 10 2000 2", expectedOutput: "2000" },
      { id: "hid_r3_2_10", input: "4 50\n1 10 100 1\n2 5 60 1\n5 8 60 1\n8 10 60 1", expectedOutput: "180" },
      { id: "hid_r3_2_11", input: "3 10\n1 5 0 1\n6 10 0 2\n11 15 0 3", expectedOutput: "0" },
      { id: "hid_r3_2_12", input: "5 5\n1 2 10 1\n2 3 10 2\n3 4 10 1\n4 5 10 2\n5 6 10 1", expectedOutput: "30" },
      { id: "hid_r3_2_13", input: "3 25\n1 4 40 1\n4 7 40 2\n7 10 40 3", expectedOutput: "70" },
      { id: "hid_r3_2_14", input: "4 10\n1 10 1000 1\n11 20 1000 1\n21 30 1000 1\n31 40 1000 1", expectedOutput: "4000" },
      { id: "hid_r3_2_15", input: "2 100\n1 5 50 1\n5 10 50 2", expectedOutput: "50" },
      { id: "hid_r3_2_16", input: "3 10\n1 3 10 1\n2 5 50 2\n4 6 20 1", expectedOutput: "50" },
      { id: "hid_r3_2_17", input: "5 0\n1 2 100 1\n2 3 100 2\n3 4 100 3\n4 5 100 1\n5 6 100 2", expectedOutput: "500" },
      { id: "hid_r3_2_18", input: "4 10\n1 5 100 1\n5 10 -5 1\n10 15 100 1\n1 15 150 2", expectedOutput: "200" },
      { id: "hid_r3_2_19", input: "2 500\n1 5 100 1\n5 10 100 2", expectedOutput: "100" },
      { id: "hid_r3_2_20", input: "3 5\n1 3 15 1\n3 5 15 2\n5 7 15 1", expectedOutput: "35" }
    ]
  }
];
