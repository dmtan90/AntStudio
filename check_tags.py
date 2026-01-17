
def check_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # extract template
    start = content.find('<template>')
    end = content.find('</template>')
    
    if start == -1 or end == -1:
        print("No template found")
        return

    template_content = content[start+10:end]
    
    lines = template_content.split('\n')
    
    stack = []
    
    # Very basic parser
    import re
    
    # Matches <tag ...> or </tag> or <tag ... />
    # We care about div, aside, main, template?
    # Actually checking all tags is hard with regex, but let's try finding all <...>
    
    # Remove comments
    template_content = re.sub(r'<!--.*?-->', '', template_content, flags=re.DOTALL)
    
    # Find all tags
    tags = re.finditer(r'<(/?)(\w[\w-]*)([^>]*)(/?)>', template_content)
    
    void_elements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']
    
    for match in tags:
        is_close = match.group(1) == '/'
        tag_name = match.group(2)
        attrs = match.group(3)
        is_self_close = match.group(4) == '/' or attrs.strip().endswith('/')
        
        if tag_name.lower() in void_elements:
            continue
            
        if is_self_close:
            continue
            
        if is_close:
            if not stack:
                print(f"Error: Unexpected closing tag </{tag_name}>")
                return
            
            last = stack.pop()
            if last != tag_name:
                print(f"Error: Mismatched tag. Expected closing </{last}> but found </{tag_name}>")
                print(f"Near: {match.group(0)}")
                return
        else:
            stack.append(tag_name)
            
    if stack:
        print(f"Error: Unclosed tags: {stack}")
    else:
        print("Structure seems balanced")

check_tags(r"d:\Workspace\Gits\CamHub\flova.ai\pages\projects\[id]\editor.vue")
