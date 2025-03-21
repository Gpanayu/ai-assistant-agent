import requests
import asyncio
import websockets
import json
import ssl
import time
import study_problem_sol
import ast
from textwrap import dedent
user_states = {}
def curl_ollama( prompt="Hi"):
    api_url = "http://prime-lab.cs.vt.edu:11434/api/generate"
    try:
        headers = {
        "Content-Type": "application/json"
         }
        payload = {
        "model": "gemma3:27b",
        "prompt": prompt,
        "stream": False,
    }
        response = requests.post(url=api_url,data=json.dumps(payload),headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Request failed with status code {response.status_code}", "details": response.text}
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

map_data = {'HumiliatingSandpiper': "# Personal Playground\n# Code will not be shared with others\nfrom study_problem_classes import Menu, Order, Customer, Restaurant\n\n\n\n\nprint('hello playground')", 'BarrenBee': "# Personal Playground\n# Code will not be shared with others\nfrom study_problem_classes import Menu, Order, Customer, Restaurant\n\n\nprint('hello playground')", 'BuoyantBadger': "# Personal Playground\n# Code will not be shared with others\nfrom study_problem_classes import Menu, Order, Customer, Restaurant\n\nprint('hello playground')", 'VariableMosquito': "# Personal Playground\n# Code will not be shared with others\nfrom study_problem_classes import Menu, Order, Customer, Restaurant\n\nprint('hello playground')", 'BlaringManatee': '# Personal Playground\n# Code will not be shared with others\nfrom study_problem_classes import Menu, Order, Customer, Restaurant\n\ndef view_menu(menu: Menu):\n    """\n    Display the menu items with their cost in the following format:\n\n    item | cost\n    chicken | 12.00\n\n    The first line is a header followed by each item and its corresponding cost on a new line.\n    """\n    pass\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n    ', 'DisastrousGuanaco': '# Personal Playground\n# Code will not be shared with others\nfrom study_problem_classes import Menu, Order, Customer, Restaurant\n\ndef cook_time_helper(restaurant: Restaurant, item: str):\n    """\n    Retrieve the cooking time for a specific item.\n\n    Args:\n        item (str): The name of the item.\n\n    Returns:\n        int: The cooking time in minutes for the item or -1 if not found.\n    """\n    return restaurant.cook_time_in_minutes[item] \n\n\n\n\nprint(\'hello playground\')'}
user="BlaringManatee"


def select_teammate(map_data, userWhoRequestedHelp):
    blaring_code = map_data.get(userWhoRequestedHelp, "")
    prompt = f"You are a teacher and User {userWhoRequestedHelp} is stuck on the following code: {blaring_code}. Please select a teammate to help. Check whoever is closer to their individual solution. Give response in JSON format of {{type of mistake, who can help}} JSON format only.\n"
    
    for user, state in map_data.items():
        prompt += f"\nUser {user} current code is: {state}\n"
        
        try:
            parsed_code = ast.parse(dedent(state))
            for node in parsed_code.body:
                if isinstance(node, ast.FunctionDef):
                    function_name = node.name                    
                    if hasattr(study_problem_sol, function_name):
                        solution_function = getattr(study_problem_sol, function_name)
                        prompt += f"Solution for {function_name} is: {solution_function.__doc__}\n"
        except Exception as e:
            prompt += f"Error parsing code: {e}\n"
    
    response = curl_ollama(prompt)
    print(response.get("response"))
    return response
select_teammate(map_data, user)


# def function_tests_complete(function_name,user):
#     send_notification(user, "")

async def handle_message(message):
    global last_doc
    data = json.loads(message)

    if data.get("event") in ["initial", "document_update"]:
        print(data)
        new_doc = data["payload"].get("doc", "")
        if last_doc != new_doc:
            last_doc = new_doc
            print(f"Updated document: {new_doc}")

    if data.get("event") == "monitorPlayground":
        map_data = data["payload"].get("editors", {})
        print(map_data)
        for user, state in map_data.items():
            if user not in user_states or user_states[user] != state:
                user_states[user] = {"state": state, "timestamp": time.time()}
                print(f"{user} is in state: {state}")

async def listen():
    uri = "wss://0.0.0.0:8000/ws/control"
    ssl_context = ssl._create_unverified_context()  # Disable SSL verification
    async with websockets.connect(uri,ssl=ssl_context) as websocket:
        asyncio.create_task(check_inactivity())
        while True:
            message = await websocket.recv()
            await handle_message(message)

async def check_inactivity():
    """
    Checks for user inactivity every 10 seconds.
    Sends a notification if the user is inactive.
    """
    while True:
        current_time = time.time()
        inactive_users = []

        for user, state in user_states.items():
            if current_time - state["timestamp"] > 20:
                inactive_users.append(user)

        if inactive_users:
            send_notification(inactive_users, ["5"])
            for user in inactive_users:
                user_states.pop(user)

        await asyncio.sleep(10)


def send_notification(users, options):
    url = "https://127.0.0.1:8000/notify" 
    payload = {
        "users": users,
        "options": options
    }
    response = requests.post(url, json=payload,verify=False)
    if response.status_code == 200:
        print("Notification sent successfully.")
    else:
        print(f"Failed to send notification: {response.text}")


if __name__ == "__main__":
    asyncio.run(listen())
