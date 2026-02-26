# OpenHands V1 代码生成执行流程详细分析报告

> **注意**: 本文档描述的是 V1 架构，基于 [Software Agent SDK](https://github.com/OpenHands/software-agent-sdk)。V0 架构文档见 `openhands-code-generation-flow.md`。

---

## 一、V1 架构概述

V1 采用完全重构的模块化架构，由独立的 Python 包组成:

| 包 | 作用 |
|---|---|
| `openhands-sdk` | 核心 SDK (Agent、LLM、Event、Tool) |
| `openhands-tools` | 内置工具集 |
| `openhands-agent-server` | Agent 服务器 |
| `openhands-workspace` | 工作空间实现 |

---

## 二、核心组件

### 2.1 SDK 核心模块

```python
# openhands-sdk/openhands/sdk/
from openhands.sdk import (
    Agent,              # 核心 Agent 类
    LLM,                # LLM 调用封装
    Tool,               # 工具基类
    Action,             # Action 定义
    Observation,         # Observation 定义
    Conversation,       # 对话管理
    LocalConversation,  # 本地对话
    RemoteConversation, # 远程对话
    Message,            # 消息
    TextContent,        # 文本内容
    ThinkingBlock,      # 思维块
    Event,              # 事件基类
)
```

### 2.2 V1 Agent 架构

```python
# openhands-sdk/openhands/sdk/agent/agent.py

class Agent(CriticMixin, AgentBase):
    """V1 核心 Agent 实现"""
    
    def __init__(self, llm: LLM, tools: list[Tool], **kwargs):
        self.llm = llm
        self.tools = tools
        # ...
    
    async def run(self, conversation: BaseConversation, user_message: str):
        """运行 Agent 处理用户消息"""
        # 核心执行逻辑
```

### 2.3 V1 工具集

```python
# openhands-tools/openhands/tools/
from openhands.tools import (
    TerminalTool,       # 终端命令执行
    FileEditorTool,      # 文件编辑
    TaskTrackerTool,     # 任务跟踪
    DelegationVisualizer,
)
from openhands.tools.browser_use import BrowserUse  # 浏览器
```

---

## 三、执行流程

### 3.1 完整调用链

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户请求                                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                        Agent Server (API Layer)                             │
│              (openhands-agent-server/)                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ POST /conversation/{id}/start                                      │  │
│  │ WebSocket /conversation/{id}/events                                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                      Conversation Service                                   │
│            (openhands-agent-server/conversation_service.py)                │
│  - 管理 conversation 生命周期                                               │
│  - 事件持久化                                                             │
│  - 状态管理                                                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                         SDK: Agent.run()                                    │
│              (openhands-sdk/openhands/sdk/agent/agent.py)                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ 1. conversation.add_message(user_message)                           │  │
│  │ 2. agent.llm.completion(messages, tools)                            │  │
│  │ 3. 解析 LLM 响应 → Action                                          │  │
│  │ 4. 执行 Action → Observation                                        │  │
│  │ 5. conversation.add_event(observation)                              │  │
│  │ 6. 循环直到完成                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                        Tool Execution                                       │
│              (openhands-tools/)                                            │
│                                                                             │
│  Action 类型 → 对应工具:                                                   │
│  ┌──────────────────┬──────────────────────────────────────────────────┐ │
│  │ TerminalAction   │ → TerminalTool.execute(command)                   │ │
│  │ FileEditAction   │ → FileEditorTool.edit(path, ...)                 │ │
│  │ BrowserAction    │ → BrowserUse.act(...)                            │ │
│  │ FinishAction     │ → 完成执行                                         │ │
│  │ ThinkAction      │ → 记录思考                                         │ │
│  │ DelegateAction   │ → 子 Agent 执行                                    │ │
│  └──────────────────┴──────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                      Event System (V1)                                      │
│              (openhands-sdk/openhands/sdk/event/)                          │
│                                                                             │
│  事件类型:                                                                │
│  ┌──────────────────┬──────────────────────────────────────────────────┐ │
│  │ ActionEvent       │ Agent 执行的动作                                   │ │
│  │ ObservationEvent  │ 动作执行结果                                       │ │
│  │ MessageEvent      │ 用户/系统消息                                      │ │
│  │ TokenEvent        │ Token 使用统计                                     │ │
│  │ ConversationStateUpdateEvent │ 状态更新                    │ │
│  │ AgentErrorEvent   │ 错误事件                                           │ │
│  └──────────────────┴──────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                      Workspace (V1)                                         │
│              (openhands-workspace/)                                         │
│                                                                             │
│  ┌──────────────────┬──────────────────────────────────────────────────┐ │
│  │ LocalWorkspace    │ 本地文件操作                                       │ │
│  │ RemoteWorkspace  │ 远程文件操作 (API)                                 │ │
│  │ CloudWorkspace   │ 云端存储                                           │ │
│  └──────────────────┴──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Agent 核心执行逻辑

```python
# V1 Agent 执行流程 (openhands-sdk)

class Agent(CriticMixin, AgentBase):
    async def run(self, conversation: BaseConversation, user_message: str):
        """主执行循环"""
        
        # 1. 添加用户消息
        user_msg = Message(role="user", content=user_message)
        conversation.add_message(user_msg)
        
        while True:
            # 2. 获取对话消息历史
            messages = conversation.get_messages()
            
            # 3. 调用 LLM
            response = await self.llm.completion(
                messages=messages,
                tools=self.tools
            )
            
            # 4. 解析 Tool Calls → Actions
            actions = self._parse_response(response)
            
            for action in actions:
                # 5. 执行 Action
                observation = await self._execute_action(action)
                
                # 6. 添加到对话历史
                conversation.add_event(observation)
                
                # 7. 检查是否完成
                if action.is_final:
                    return action.result
    
    async def _execute_action(self, action: Action) -> Observation:
        """执行 Action 并返回 Observation"""
        
        # 查找对应工具
        tool = self._resolve_tool(action.tool_name)
        
        # 执行工具
        result = await tool.execute(action.args)
        
        # 返回 Observation
        return Observation(
            content=result,
            tool_name=action.tool_name,
        )
```

---

## 四、事件系统 (V1)

### 4.1 事件类型层次

```
Event (基类)
├── ActionEvent
│   ├── TerminalAction
│   ├── FileEditAction
│   ├── BrowserAction
│   └── ...
├── ObservationEvent
│   ├── TerminalObservation
│   ├── FileEditObservation
│   └── ...
├── MessageEvent
│   ├── UserMessage
│   └── SystemMessage
├── TokenEvent
├── ConversationStateUpdateEvent
└── AgentErrorEvent
```

### 4.2 事件溯源

V1 事件系统支持完整的事件溯源:

```python
# 事件持久化
conversation.add_event(ActionEvent(...))
conversation.add_event(ObservationEvent(...))

# 事件重放
for event in conversation.get_events():
    # 重放每个事件
```

---

## 五、工具系统 (V1)

### 5.1 内置工具

| 工具 | 模块 | 功能 |
|------|------|------|
| TerminalTool | `terminal/` | 执行终端命令 |
| FileEditorTool | `file_editor/` | 文件编辑/读取 |
| BrowserUse | `browser_use/` | 浏览器自动化 |
| TaskTrackerTool | `task_tracker/` | 任务管理 |
| DelegationTool | `delegate/` | Agent 委托 |
| GlobTool | `glob/` | 文件搜索 |
| GrepTool | `grep/` | 内容搜索 |

### 5.2 工具定义模式

```python
# 工具定义 (definition.py)
class TerminalTool(Tool):
    name = "terminal"
    description = "Execute terminal commands"
    parameters = {
        "command": {"type": "string", "description": "Command to execute"},
        "timeout": {"type": "integer", "description": "Timeout in seconds"}
    }

# 工具实现 (impl.py)
class TerminalToolImpl:
    async def execute(self, command: str, timeout: int = 60) -> str:
        result = await run_command(command, timeout=timeout)
        return result.stdout + result.stderr
```

---

## 六、Workspace 系统 (V1)

### 6.1 Workspace 类型

```python
# openhands-workspace/

from openhands.workspace import Workspace

# 本地工作空间
workspace = LocalWorkspace(base_path="/path/to/workspace")

# 远程工作空间 (通过 API)
workspace = RemoteWorkspace(
    api_url="http://agent-server:8000",
    conversation_id="uuid"
)

# 云端工作空间
workspace = CloudWorkspace(
    provider="s3",
    bucket="bucket-name"
)
```

---

## 七、关键文件索引

### SDK 核心

| 文件 | 类/函数 | 作用 |
|------|---------|------|
| `sdk/agent/agent.py` | `Agent` | 核心 Agent 类 |
| `sdk/agent/base.py` | `AgentBase` | Agent 基类 |
| `sdk/llm/llm.py` | `LLM` | LLM 调用 |
| `sdk/event/base.py` | `Event` | 事件基类 |
| `sdk/event/action_event.py` | `ActionEvent` | Action 事件 |
| `sdk/tool/tool.py` | `Tool` | 工具基类 |
| `sdk/conversation/conversation.py` | `Conversation` | 对话管理 |

### Agent Server

| 文件 | 作用 |
|------|------|
| `agent_server/conversation_service.py` | 会话服务 |
| `agent_server/conversation_router.py` | 会话路由 |
| `agent_server/event_router.py` | 事件路由 |
| `agent_server/tool_router.py` | 工具路由 |

### Tools

| 文件 | 作用 |
|------|------|
| `tools/terminal/` | 终端工具 |
| `tools/file_editor/` | 文件编辑工具 |
| `tools/browser_use/` | 浏览器工具 |
| `tools/task_tracker/` | 任务跟踪工具 |

---

## 八、V0 vs V1 架构对比

### 架构差异

| 维度 | V0 | V1 |
|------|----|----|
| **代码位置** | `openhands/` 单一仓库 | `software-agent-sdk/` 独立包 |
| **Agent** | `agenthub/codeact_agent/` | `openhands-sdk/sdk/agent/` |
| **LLM** | `llm/llm.py` | `openhands-sdk/sdk/llm/` |
| **Event** | 内存 EventStream | 数据库事件溯源 |
| **Tool** | Runtime 内嵌 | 独立工具包 |
| **Server** | `server/` | `agent_server/` |
| **Workspace** | Runtime 的一部分 | 独立包 |

### 执行流程对比

```
V0 流程:
User → API → AgentController → CodeActAgent → LLM → Action → Runtime → Observation → UI

V1 流程:
User → AgentServer → Conversation → Agent → LLM → Action → Tools → Observation → Events → UI
```

---

## 九、总结

V1 架构核心改进:

1. **模块化**: SDK、Tools、Server、Workspace 独立发布
2. **事件溯源**: 完整的事件持久化和重放
3. **类型安全**: Python 3.12+ 完整类型注解
4. **可扩展性**: 更好的插件和 Subagent 支持
5. **现代化**: 改进的工具实现

V1 已经完全实现并可投入使用，与 OpenHands 主仓库的集成正在进行中。

---

## 附录

- [Software Agent SDK 仓库](https://github.com/OpenHands/software-agent-sdk)
- [SDK 文档](https://docs.openhands.ai/sdk)
- V0 架构文档: `openhands-code-generation-flow.md`
