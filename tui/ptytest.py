import pty, os, sys, time, select, struct, fcntl, termios, pyte
rows,cols=int(sys.argv[1]),int(sys.argv[2]); keys=sys.argv[3:] 
pid,fd=pty.fork()
if pid==0:
    os.execvp('node',['node','/home/claude/tui/tui.js'])
fcntl.ioctl(fd,termios.TIOCSWINSZ,struct.pack('HHHH',rows,cols,0,0))
screen=pyte.Screen(cols,rows); st=pyte.ByteStream(screen)
def pump(sec):
    end=time.time()+sec
    while time.time()<end:
        r,_,_=select.select([fd],[],[],0.05)
        if r:
            try: d=os.read(fd,65536)
            except OSError: return False
            st.feed(d)
    return True
pump(2.5)
for k in keys:
    if k.startswith('w'): pump(float(k[1:])); continue
    os.write(fd,k.replace('\\r','\r').replace('\\x1b','\x1b').encode()); pump(0.4)
print('\n'.join(screen.display))
os.write(fd,b'q'); pump(0.3)
