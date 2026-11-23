import pty, os, sys, time, select, struct, fcntl, termios, subprocess
pid,fd=pty.fork()
if pid==0: os.execvp('node',['node','/home/claude/tui/tui.js'])
fcntl.ioctl(fd,termios.TIOCSWINSZ,struct.pack('HHHH',32,100,0,0))
tot=0
def pump(sec):
    global tot
    end=time.time()+sec
    while time.time()<end:
        r,_,_=select.select([fd],[],[],0.02)
        if r:
            d=os.read(fd,65536); tot+=len(d)
pump(2)
for k in [' ',None,' ',None,' ',None,' ',None]+[' ']*8:
    if k is None: pump(3)
    else: os.write(fd,k.encode()); pump(1.5)
t0=tot; c0=open(f'/proc/{pid}/stat').read().split(); u0=int(c0[13])+int(c0[14]); pump(10)
c1=open(f'/proc/{pid}/stat').read().split(); u1=int(c1[13])+int(c1[14])
print('bytes/s',(tot-t0)/10,'cpu%',(u1-u0)/100/10*100)
os.write(fd,b'q')
